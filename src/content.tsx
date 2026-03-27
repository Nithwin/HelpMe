import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const extApi = (globalThis as any).browser ?? (globalThis as any).chrome;

let container: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;

const DEFAULTS = {
  position: { top: '20px', left: null as string | null, right: '20px' },
  isTransparent: true,
};

// --- Command Listener ---
extApi.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  switch (request.command) {
    case 'toggle-extension':
    case 'toggle-and-focus':
      toggleExtensionUI(request.command === 'toggle-and-focus');
      sendResponse({ status: "UI Toggled" });
      break;
    case 'ask-selection':
    case 'ask-mcq-auto':
      const selectionText = window.getSelection()?.toString().trim();
      if (selectionText) {
        const isAutoSelect = request.command === 'ask-mcq-auto';
        toggleExtensionUI(true, 'open');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('gemini-ask-selection', { 
            detail: { text: selectionText, autoSelect: isAutoSelect } 
          }));
        }, 300);
      }
      sendResponse({ status: "Asking selection" });
      break;
    case 'reset-chat':
      window.dispatchEvent(new CustomEvent('reset-gemini-chat'));
      sendResponse({ status: "Reset command dispatched" });
      break;
    case 'reset-position':
      resetPosition();
      sendResponse({ status: "Position reset" });
      break;
    case 'toggle-transparency':
      toggleTransparency();
      sendResponse({ status: "Transparency toggled" });
      break;
  }
  return true;
});

// --- UI Management ---
function toggleExtensionUI(focusInput = false, forceState: 'open' | 'close' | 'toggle' = 'toggle') {
  if (!container) {
    if (forceState === 'close') return;
    createUI().then(() => {
      if (focusInput && shadowRoot) {
        setTimeout(() => (shadowRoot!.querySelector('textarea') as HTMLTextAreaElement)?.focus(), 150);
      }
    });
  } else {
    const isVisible = container.style.display === 'block';
    let shouldBeVisible = !isVisible;
    
    if (forceState === 'open') shouldBeVisible = true;
    else if (forceState === 'close') shouldBeVisible = false;

    container.style.display = shouldBeVisible ? 'block' : 'none';
    
    if (shouldBeVisible && focusInput && shadowRoot) {
      setTimeout(() => (shadowRoot!.querySelector('textarea') as HTMLTextAreaElement)?.focus(), 150);
    }
  }
}

async function createUI() {
  container = document.createElement('div');
  container.id = 'helpme-shadow-container';
  document.body.appendChild(container);

  const state = await extApi.storage.local.get(['position', 'isTransparent']);
  const currentPos = state.position || DEFAULTS.position;
  const isTransparent = state.isTransparent !== undefined ? state.isTransparent : DEFAULTS.isTransparent;

  Object.assign(container.style, {
    position: 'fixed',
    top: currentPos.top,
    right: currentPos.right,
    left: currentPos.left,
    width: '400px',
    height: '550px',
    zIndex: '2147483647',
    display: 'block',
    borderRadius: '16px',
    overflow: 'hidden',
    transition: 'background-color 0.3s, backdrop-filter 0.3s, border 0.3s',
  });
  
  if (isTransparent) {
    container.classList.add('is-transparent');
  }

  shadowRoot = container.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    :host {
      all: initial;
    }
    #react-root { 
      height: 100%; 
      width: 100%;
    }
  `;
  shadowRoot.appendChild(styleEl);

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = extApi.runtime.getURL('assets/content.css');
  shadowRoot.appendChild(styleLink);
  
  // Also inject the bundled App.css (Vite will output this)
  const appStyleLink = document.createElement('link');
  appStyleLink.rel = 'stylesheet';
  appStyleLink.href = extApi.runtime.getURL('assets/App.css');
  shadowRoot.appendChild(appStyleLink);

  const appRoot = document.createElement('div');
  appRoot.id = 'react-root';
  shadowRoot.appendChild(appRoot);

  ReactDOM.createRoot(appRoot).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Wait for React to render the header before making it draggable
  setTimeout(() => {
    const header = shadowRoot?.querySelector('.app-header');
    if (header && container) makeDraggable(container, header as HTMLElement);
  }, 500);

  window.addEventListener('reset-gemini-position', resetPosition);
  
  // MCQ Auto-Select Listener
  window.addEventListener('gemini-select-answer', (e: any) => {
    const answer = e.detail; // e.g. "A" or "Paris"
    if (!answer) return;
    
    extApi.storage.local.get(['autoDelay']).then((res: { autoDelay?: boolean }) => {
      const waitTime = (res.autoDelay !== false) ? Math.floor(Math.random() * 2000) + 1000 : 0;
      setTimeout(() => autoClickAnswer(answer), waitTime);
    });
  });

  enableSelectionBypass();
}

function enableSelectionBypass() {
  const style = document.createElement('style');
  style.id = 'helpme-bypass-styles';
  style.textContent = `
    * {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.documentElement.appendChild(style);

  const protectorEvents = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'mousedown', 'mouseup'];
  protectorEvents.forEach(eventType => {
    window.addEventListener(eventType, (e) => {
      // Allow helpme interactions to pass through if they are blocked by site scripts
      e.stopImmediatePropagation();
    }, true);
  });
}


function autoClickAnswer(answer: string) {
  const norm = answer.trim().toLowerCase();
  const cleanAnswer = norm.replace(/^[a-da-d][),.]\s*/, '').trim();
  const letterMatch = answer.match(/^([a-dA-D])[),.]/);
  const letter = letterMatch ? letterMatch[1].toUpperCase() : null;

  console.log('[HelpMe] Attempting auto-click for:', { answer, cleanAnswer, letter });

  // 1. Precise Letter/Text Match in Labels/Buttons
  const allElements = document.querySelectorAll('button, input, label, div, span, li, a, [role="button"], [role="radio"]');
  
  for (const el of Array.from(allElements)) {
    const element = el as HTMLElement;
    const text = element.textContent?.trim() || '';
    const val = (element as HTMLInputElement).value || '';
    
    // Check for radio/checkbox inputs specifically first
    if (element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')) {
      const parentLabel = element.closest('label');
      const associatedLabel = document.querySelector(`label[for="${element.id}"]`);
      const labelText = (parentLabel?.textContent || associatedLabel?.textContent || '').trim().toLowerCase();
      
      if (cleanAnswer && labelText.includes(cleanAnswer)) {
        element.click();
        return;
      }
      if (letter && (labelText.startsWith(letter) || labelText.includes(`${letter}.`) || labelText.includes(`${letter})`))) {
        element.click();
        return;
      }
    }

    // Check generic text-based clickable elements
    const elementText = text.toLowerCase();
    if (cleanAnswer && elementText === cleanAnswer) {
      element.click();
      return;
    }
    
    if (letter) {
      const regex = new RegExp(`^${letter}[\\.\\)\\s]`, 'i');
      if (regex.test(text)) {
        element.click();
        return;
      }
    }
  }

  // 2. Deep Heuristic Search
  for (const el of Array.from(allElements)) {
    const element = el as HTMLElement;
    const text = (element.innerText || element.textContent || '').trim().toLowerCase();
    if (cleanAnswer && text.length > 0 && cleanAnswer.includes(text) && text.length > 3) {
      element.click();
      return;
    }
  }

  // 3. Fallback: Search for SVG/Canvas containers (Simulated click on center of matched text)
  // Note: Canvas is difficult without OCR coordinates, but we can try reaching for containers
}

function resetPosition() {
  if (!container) return;
  Object.assign(container.style, {
    top: DEFAULTS.position.top,
    left: DEFAULTS.position.left,
    right: DEFAULTS.position.right
  });
  extApi.storage.local.set({ position: DEFAULTS.position });
}

function toggleTransparency() {
  if (!container) return;
  const isTransparent = container.classList.toggle('is-transparent');
  extApi.storage.local.set({ isTransparent });
}

function makeDraggable(element: HTMLElement, handle: HTMLElement) {
  let initialX: number, initialY: number, xOffset = 0, yOffset = 0;

  handle.style.cursor = 'move';
  handle.onmousedown = (e: MouseEvent) => {
    e.preventDefault();
    const rect = element.getBoundingClientRect();
    xOffset = rect.left;
    yOffset = rect.top;
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    document.onmousemove = dragElement;
    document.onmouseup = closeDragElement;
  };

  function dragElement(e: MouseEvent) {
    e.preventDefault();
    const newX = e.clientX - initialX;
    const newY = e.clientY - initialY;

    const newTop = Math.max(0, Math.min(newY, window.innerHeight - element.offsetHeight));
    const newLeft = Math.max(0, Math.min(newX, window.innerWidth - element.offsetWidth));

    element.style.top = `${newTop}px`;
    element.style.left = `${newLeft}px`;
    element.style.right = 'auto';
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    extApi.storage.local.set({ 
      position: { top: element.style.top, left: element.style.left, right: null } 
    });
  }
}

// Shortcut Fallback
if (!(window as any).__helpMeShortcutAdded) {
  (window as any).__helpMeShortcutAdded = true;
  window.addEventListener('keydown', (e) => {
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    const spacePressed = (e.code === 'Space') || (e.key === ' ') || (e.keyCode === 32);
    
    if (ctrlOrMeta && spacePressed) {
      if (shadowRoot && shadowRoot.contains(e.target as Node)) {
        // Toggle even if focused inside
      }
      e.preventDefault();
      toggleExtensionUI(true, 'toggle');
    }
  }, true);
}
