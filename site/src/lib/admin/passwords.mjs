import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const DEFAULT_SCRYPT_COST = 16384;
const DEFAULT_BLOCK_SIZE = 8;
const DEFAULT_PARALLELIZATION = 1;

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseHash(storedHash) {
  const [algorithm, cost, blockSize, parallelization, salt, digest] = String(storedHash || "").split("$");
  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !salt || !digest) {
    return null;
  }

  return {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
    salt,
    digest,
  };
}

export async function hashAdminPassword(password, options = {}) {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Admin passwords must be at least 8 characters long");
  }

  const cost = options.cost || DEFAULT_SCRYPT_COST;
  const blockSize = options.blockSize || DEFAULT_BLOCK_SIZE;
  const parallelization = options.parallelization || DEFAULT_PARALLELIZATION;
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });

  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    Buffer.from(derived).toString("base64url"),
  ].join("$");
}

export async function verifyAdminPassword(password, storedHash) {
  if (typeof password !== "string" || !storedHash) {
    return false;
  }

  const parsed = parseHash(storedHash);
  if (!parsed) {
    return false;
  }

  const derived = await scrypt(password, Buffer.from(parsed.salt, "base64url"), KEY_LENGTH, {
    N: parsed.cost,
    r: parsed.blockSize,
    p: parsed.parallelization,
  });

  return safeCompare(Buffer.from(derived).toString("base64url"), parsed.digest);
}
