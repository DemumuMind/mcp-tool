const DEFAULT_RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(input, options = {}) {
  const {
    retries = 2,
    retryDelayMs = 500,
    timeoutMs = 10000,
    retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES,
    fetchImpl = fetch,
    ...init
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      if (retryableStatusCodes.has(response.status) && attempt < retries) {
        await sleep(retryDelayMs * (2 ** attempt));
        attempt++;
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt >= retries) {
        throw error;
      }

      await sleep(retryDelayMs * (2 ** attempt));
      attempt++;
    }
  }

  throw lastError;
}
