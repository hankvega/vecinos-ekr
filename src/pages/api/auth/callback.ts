import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';

export const GET: APIRoute = async (context) => {
  const { url } = context;
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = createClient(context);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return Response.redirect(new URL('/', url), 302);
    }
  }
    if (code) {
      const supabase = createClient(context);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error('Callback error:', error.message);
      else return new Response(null, { status: 302, headers: { Location: '/ekr' } });
    } else {
      console.error('Callback sin code. URL:', url.toString());
    }
  return Response.redirect(new URL('/login?error=No+se+pudo+verificar+el+acceso', url), 302);
};
