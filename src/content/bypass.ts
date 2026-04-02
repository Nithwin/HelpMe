export function enableSelectionBypass(container: HTMLElement | null) {
  const css = `
    * {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
  `;
  const style = document.createElement('style');
  style.id = 'exampilot-bypass-styles';
  style.textContent = css;
  document.documentElement.appendChild(style);

  // Advanced: Stop sites from overriding copy/contextmenu
  const protectorEvents = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'dragstart'];
  
  const preventBlocking = (e: Event) => {
    // Check if the event was triggered inside our assistant
    const isExtensionTarget = container && container.contains(e.target as Node);
    
    // If it's a site event and it's being blocked, stop the block
    if (!isExtensionTarget) {
      e.stopImmediatePropagation();
    }
  };

  protectorEvents.forEach(eventType => {
    window.addEventListener(eventType, preventBlocking, true);
    document.addEventListener(eventType, preventBlocking, true);
  });

  // Force-unlock text selection properties
  Object.defineProperty(document, 'oncopy', { get: () => null, set: () => {}, configurable: true });
  Object.defineProperty(document, 'oncontextmenu', { get: () => null, set: () => {}, configurable: true });
}
