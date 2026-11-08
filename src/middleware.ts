import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, getSessionUser } from './lib/auth';

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/');

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (!isAdminPath(pathname)) return next();

  const isLogin = pathname === '/admin/login' || pathname === '/admin/login/';
  let user = null;
  try {
    user = await getSessionUser(context.cookies.get(SESSION_COOKIE)?.value);
  } catch (error) {
    console.error('[auth] session lookup failed:', error);
    return new Response('Something went wrong.', { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!user && !isLogin) return context.redirect('/admin/login');
  if (user && isLogin) return context.redirect('/admin');
  context.locals.user = user ?? undefined;

  const response = await next();
  // Admin pages are private: never cached, never indexed.
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
});
