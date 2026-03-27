import { DEFAULT_ALLOWED_HOSTS } from './config.js';

function normalizeHost(value) {
  return String(value || '').trim().toLowerCase();
}

export function getHostnameFromSender(sender) {
  try {
    const tabUrl = sender?.tab?.url;
    if (!tabUrl) return null;
    return new URL(tabUrl).hostname;
  } catch {
    return null;
  }
}

export function isAllowedHost(hostname, allowedHosts) {
  if (!hostname) {
    return false;
  }

  const host = normalizeHost(hostname);
  const rules = (allowedHosts || DEFAULT_ALLOWED_HOSTS).map(normalizeHost).filter(Boolean);
  return rules.some((rule) => host === rule || host.endsWith(`.${rule}`));
}
