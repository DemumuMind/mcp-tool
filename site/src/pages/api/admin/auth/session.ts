import { randomUUID } from "node:crypto";
import type { APIRoute } from "astro";
import { jsonError, jsonOk, readJsonBody } from "../../../../lib/admin/http.mjs";
import { authenticateAdminUser } from "../../../../lib/admin/session.mjs";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
  signAdminSessionCookie,
} from "../../../../lib/admin/session-cookie.mjs";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.adminUser) {
    return jsonError(401, "Admin session required");
  }

  return jsonOk({
    user: locals.adminUser,
    csrfToken: locals.csrfToken,
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await readJsonBody(request);
    const result = await authenticateAdminUser(body.email, body.password ?? body.accessCode);

    if (!result.ok) {
      return jsonError(401, result.error);
    }

    const csrfToken = randomUUID();
    cookies.set(
      ADMIN_SESSION_COOKIE,
      signAdminSessionCookie({ ...result.user, csrfToken }),
      getAdminSessionCookieOptions()
    );

    return jsonOk({
      user: result.user,
      csrfToken,
      bootstrapMode: result.bootstrapMode,
    });
  } catch (error) {
    return jsonError(error.statusCode || 500, error.statusCode >= 500 ? "Internal admin error" : error.message);
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete(ADMIN_SESSION_COOKIE, { path: "/" });
  return jsonOk({ cleared: true });
};
