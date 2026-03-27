export function getHostnameFromSender(sender: chrome.runtime.MessageSender): string {
  if (sender.url) {
    try {
      return new URL(sender.url).hostname;
    } catch {
      return '';
    }
  }
  return '';
}

export function isAllowedHost(hostname: string, allowedHosts: string[] = []): boolean {
  return true; // Unblock all sites completely.
}
