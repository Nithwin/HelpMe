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
}

function autoClickAnswer(answer: string) {
  const normalizedAnswer = answer.replace(/^[a-dA-D][),.]\s*/, '').trim().toLowerCase();
  const letterMatch = answer.match(/^([a-dA-D])[),.]/);
  const letter = letterMatch ? letterMatch[1].toUpperCase() : null;

  // Search strategy 1: Radios/Checkboxes with labels
  const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
  for (const input of Array.from(inputs)) {
    const label = document.querySelector(`label[for="${input.id}"]`) || input.closest('label');
    if (label) {
      const labelText = label.textContent?.trim().toLowerCase() || '';
      if (normalizedAnswer && labelText.includes(normalizedAnswer)) {
        (input as HTMLElement).click();
        return;
      }
      if (letter && labelText.startsWith(letter)) {
        (input as HTMLElement).click();
        return;
      }
    }
  }

  // Search strategy 2: Divs/Buttons that look like options
  const clickables = document.querySelectorAll('div, button, li, span');
  for (const el of Array.from(clickables)) {
    const text = el.textContent?.trim() || '';
    if (text === answer || (normalizedAnswer && text.toLowerCase() === normalizedAnswer)) {
      (el as HTMLElement).click();
      return;
    }
  }
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
