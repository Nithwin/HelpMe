import { MAX_RETRIES, REQUEST_TIMEOUT_MS } from './config.js';

export function isModelFailure(status, responseText) {
  return status === 404 || /model|not found|unsupported|does not exist/i.test(responseText);
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function isRetryableNetworkError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('timeout') || message.includes('aborted') || message.includes('network');
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timerId);
  }
}

export async function performRequestWithRetry(makeRequest) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await makeRequest(fetchWithTimeout);
      if (response.ok) {
        return { ok: true, response };
      }

      const errText = await response.text();
      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        continue;
      }

      return {
        ok: false,
        status: response.status,
        errText,
      };
    } catch (error) {
      lastError = error;
      if (isRetryableNetworkError(error) && attempt < MAX_RETRIES) {
        continue;
      }

      return {
        ok: false,
        networkError: error,
      };
    }
  }

  return {
    ok: false,
    networkError: lastError || new Error('Unknown request failure'),
  };
}
