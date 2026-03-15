import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { findInternalUserByEmail, hasCapability, loadAdminState } from "./control-plane.mjs";
import { hashAdminPassword, verifyAdminPassword } from "./passwords.mjs";
import { mutateRawAdminStore } from "./store.mjs";

const ADMIN_SEED_URL = new URL("../../data/admin-control-plane.json", import.meta.url);

function safeCompare(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function canUseBootstrapAuth() {
  return process.env.NODE_ENV !== "production" && !process.env.ADMIN_ACCESS_CODE;
}

export function validateAccessCode(accessCode) {
  const expected = process.env.ADMIN_ACCESS_CODE;
  if (!expected) {
    return canUseBootstrapAuth();
  }
  return safeCompare(String(accessCode || ""), expected);
}

export function sanitizeAdminUser(user) {
  return user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    : null;
}

export async function authenticateAdminUser(email, accessCode) {
  const state = await loadAdminState();
  const user = await findInternalUserByEmail(email, state);
  if (!user) {
    return { ok: false, error: "Invalid admin credentials" };
  }

  const hasPasswordHash = Boolean(user.passwordHash);
  const credentialAccepted = hasPasswordHash
    ? await verifyAdminPassword(accessCode, user.passwordHash)
    : validateAccessCode(accessCode);

  if (!credentialAccepted) {
    return { ok: false, error: "Invalid admin credentials" };
  }

  return {
    ok: true,
    user: sanitizeAdminUser(user),
    bootstrapMode: !hasPasswordHash && canUseBootstrapAuth(),
  };
}

function loadSeedAdminStore() {
  try {
    return JSON.parse(readFileSync(ADMIN_SEED_URL, "utf8"));
  } catch {
    return { version: 1, users: [] };
  }
}

export async function setAdminUserPassword(email, password, env = process.env, options = {}) {
  const idempotencyKey = options.idempotencyKey;
  const result = await mutateRawAdminStore(
    async (store) => {
      const ledgerKey = idempotencyKey ? `mutation:admin-password:${idempotencyKey}` : "";
      if (ledgerKey && store.idempotencyLedger?.[ledgerKey]?.data) {
        return store.idempotencyLedger[ledgerKey].data;
      }

      const userIndex = store.users.findIndex(
        (entry) => entry.email?.toLowerCase() === String(email || "").toLowerCase()
      );

      if (userIndex === -1) {
        const error = new Error(`Unknown internal user ${email}`);
        error.statusCode = 404;
        throw error;
      }

      store.users[userIndex] = {
        ...store.users[userIndex],
        passwordHash: await hashAdminPassword(password),
        passwordUpdatedAt: new Date().toISOString(),
      };

      const sanitizedUser = sanitizeAdminUser(store.users[userIndex]);
      if (ledgerKey) {
        store.idempotencyLedger = store.idempotencyLedger || {};
        store.idempotencyLedger[ledgerKey] = {
          kind: "mutation",
          recordedAt: new Date().toISOString(),
          data: sanitizedUser,
        };
      }

      return sanitizedUser;
    },
    env,
    { seedFactory: () => loadSeedAdminStore() }
  );

  return result.data;
}

export { hashAdminPassword, verifyAdminPassword };

export function ensureCapability(user, capability) {
  if (!user) {
    const error = new Error("Admin session required");
    error.statusCode = 401;
    throw error;
  }

  if (capability && !hasCapability(user.role, capability)) {
    const error = new Error("Insufficient permissions");
    error.statusCode = 403;
    throw error;
  }

  return user;
}
