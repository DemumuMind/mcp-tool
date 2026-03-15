import { defineMiddleware } from "astro:middleware";
import { verifyAdminSessionCookie, ADMIN_SESSION_COOKIE } from "./lib/admin/session-cookie.mjs";
import { withBase } from "./lib/site-paths";

const ADMIN_PREFIX = withBase("/admin/");
const ADMIN_API_PREFIX = withBase("/api/admin/");
const LOGIN_PATH = withBase("/admin/login/");
const SESSION_API_PATH = withBase("/api/admin/auth/session/");

function withSecurityHeaders(response: Response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "same-origin");
  return response;
}

function jsonUnauthorized(message: string) {
  return withSecurityHeaders(
    new Response(JSON.stringify({ success: false, error: message }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  const isAdminPage = pathname.startsWith(ADMIN_PREFIX);
  const isAdminApi = pathname.startsWith(ADMIN_API_PREFIX);
  const isSessionRoute = pathname.startsWith(SESSION_API_PATH);
  const isLoginRoute = pathname.startsWith(LOGIN_PATH);

  if (!isAdminPage && !isAdminApi) {
    return next();
  }

  const rawToken = context.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  const sessionUser = verifyAdminSessionCookie(rawToken);
  const adminUser = sessionUser
    ? {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
      }
    : null;
  const csrfToken = sessionUser?.csrfToken || null;

  context.locals.adminUser = adminUser;
  context.locals.csrfToken = csrfToken;
  context.locals.isAdminAuthenticated = Boolean(adminUser);

  if (!adminUser && !isLoginRoute && !isSessionRoute) {
    if (isAdminApi) {
      return jsonUnauthorized("Admin session required");
    }

    const loginUrl = new URL(LOGIN_PATH, context.url);
    loginUrl.searchParams.set("next", pathname);
    return Response.redirect(loginUrl, 302);
  }

  return withSecurityHeaders(await next());
});
