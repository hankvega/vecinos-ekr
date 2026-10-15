import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export function createClient(context: { request: Request; cookies: any }): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Variables de Supabase no cargadas. Revisa .env.local');
  }

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });
}