// Constants moved from config to avoid circular dependency if needed, 
// but here they are imported from config.
import { REQUEST_TIMEOUT_MS } from './config';

const MAX_RETRIES = 1;

export interface RequestResult {
  ok: boolean;
  response?: Response;
  status?: number;
  errText?: string;
  networkError?: any;
}

export function isModelFailure(status: number, responseText: string): boolean {
  return status === 404 || /model|not found|unsupported|does not exist/i.test(responseText);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isRetryableNetworkError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('timeout') || message.includes('aborted') || message.includes('network');
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timerId);
  }
}

export async function performRequestWithRetry(
  makeRequest: (f: typeof fetchWithTimeout) => Promise<Response>
): Promise<RequestResult> {
  let lastError: any = null;

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
