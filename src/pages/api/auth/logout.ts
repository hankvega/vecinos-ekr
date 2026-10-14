import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context);
  await supabase.auth.signOut();
  return new Response(null, {
    status: 302,
    headers: { Location: '/login' },
  });
};