import { ensureCapability } from "./session.mjs";

export function jsonOk(data, meta = {}) {
  return new Response(JSON.stringify({ success: true, data, meta }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function jsonError(status, error, details) {
  return new Response(JSON.stringify({ success: false, error, details }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

export function requireAdmin(context, capability) {
  return ensureCapability(context.locals.adminUser || null, capability);
}

export function requireCsrf(context) {
  const expected = context.locals.csrfToken;
  const actual = context.request.headers.get("x-admin-csrf");

  if (!expected || !actual || expected !== actual) {
    const error = new Error("Invalid CSRF token");
    error.statusCode = 403;
    throw error;
  }
}

export function requireIdempotencyKey(request) {
  const key = request.headers.get("x-idempotency-key");
  if (!key) {
    const error = new Error("Missing X-Idempotency-Key header");
    error.statusCode = 400;
    throw error;
  }
  return key;
}

export function handleAdminError(error) {
  const status = error?.statusCode || 500;
  return jsonError(status, status >= 500 ? "Internal admin error" : error.message);
}

export function withAdminApi(capability, handler) {
  return async (context) => {
    try {
      const user = requireAdmin(context, capability);
      return await handler(context, user);
    } catch (error) {
      return handleAdminError(error);
    }
  };
}
