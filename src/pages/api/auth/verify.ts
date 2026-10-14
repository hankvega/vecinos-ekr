import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async (context) => {
  try {
    const { email, token } = await context.request.json();

    if (!email || !token || typeof email !== 'string' || typeof token !== 'string') {
      return json({ error: 'Faltan datos' }, 400);
    }

    const supabase = createClient(context);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      console.error('verifyOtp error:', error.message);
      return json({ error: 'Código inválido o expirado' }, 400);
    }

    return json({ ok: true });
  } catch (err: any) {
    return json({ error: 'Error interno: ' + err.message }, 500);
  }
};