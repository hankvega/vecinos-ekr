import { defineMiddleware } from 'astro:middleware';
import { createClient } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, redirect, locals } = context;

  const isPublic =
    url.pathname === '/' ||
    ['/login', '/api/auth'].some((p) => url.pathname.startsWith(p));

  if (isPublic) {
    return next();
  }

  const supabase = createClient(context);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  locals.user = user;
  return next();
});