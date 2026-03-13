import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "__dm_admin";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 12;

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret(secret = process.env.ADMIN_SESSION_SECRET) {
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV !== "production") {
    return "demumumind-admin-dev-secret";
  }
  throw new Error("ADMIN_SESSION_SECRET is required in production");
}

function signPayload(payload, secret) {
  return createHmac("sha256", getSessionSecret(secret)).update(payload).digest("base64url");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function signAdminSessionCookie(user, secret = process.env.ADMIN_SESSION_SECRET) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    ...user,
    iat: now,
    exp: now + DEFAULT_SESSION_TTL_SECONDS,
  });
  const encodedPayload = toBase64Url(payload);
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionCookie(token, secret = process.env.ADMIN_SESSION_SECRET) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expected = signPayload(encodedPayload, secret);
  if (!safeCompare(signature, expected)) {
    return null;
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export function getAdminSessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: DEFAULT_SESSION_TTL_SECONDS,
  };
}
