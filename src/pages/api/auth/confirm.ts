import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';

export const GET: APIRoute = async (context) => {
  const token_hash = context.url.searchParams.get('token_hash');
  const type = context.url.searchParams.get('type') as 'email' | null;

  if (token_hash && type) {
    const supabase = createClient(context);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) console.error('verifyOtp error:', error.message);
    else return context.redirect('/ekr');
  }
  return context.redirect('/login?error=No+se+pudo+verificar+el+acceso');
};