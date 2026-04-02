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
    case 'ask-coding-auto':
      const selectionText = window.getSelection()?.toString().trim();
      if (selectionText) {
        let mode: 'mcq' | 'coding' | 'general' = 'general';
        if (request.command === 'ask-mcq-auto') mode = 'mcq';
        else if (request.command === 'ask-coding-auto') mode = 'coding';

        if (mode === 'general') {
          toggleExtensionUI(true, 'open');
        } else {
          if (!container) createUI('none');
        }
        
        // Wait briefly for React initialization if UI was just created invisibly
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('gemini-ask-selection', { 
            detail: { text: selectionText, mode } 
          }));
        }, 500);
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
    createUI('block').then(() => {
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

async function createUI(initialDisplay: 'block' | 'none' = 'block') {
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
    display: initialDisplay,
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

  let latestCodeSolution = '';

  // Coding Store Listener (from Alt+C)
  window.addEventListener('gemini-store-code', (e: any) => {
    const code = e.detail;
    if (!code) return;
    latestCodeSolution = code;
    console.log('[HelpMe] Code solution stored. Press Alt+V to stealth type it.');
  });

  // Stealth Typing Trigger (Alt+V)
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.altKey && e.code === 'KeyV') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (latestCodeSolution) {
        stealthTypeCode(latestCodeSolution);
      } else {
        console.warn('[HelpMe] No code stored. Press Alt+C first.');
      }
    }
  }, true);

  enableSelectionBypass();
}

async function stealthTypeCode(code: string) {
  // Strip markdown code blocks if present
  const cleanCode = code.replace(/```[\w]*\n?|```/g, '').trim();
  
  // Find target: active element or best guess editor
  let target = document.activeElement as HTMLElement;
  
  const selectors = [
    'textarea', 
    '[contenteditable="true"]', 
    '.ace_text-input', 
    '.monaco-mouse-cursor-text', 
    '.cm-content', 
    '.inputarea',
    '[role="textbox"]',
    '.view-lines',
    '.css-153p9ug' // Specific LeetCode editor
  ];

  // If active is not a text input, search for the biggest textarea or editor
  if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement || target.isContentEditable)) {
    const editors = document.querySelectorAll(selectors.join(','));
    if (editors.length > 0) {
      target = editors[0] as HTMLElement;
    }
  }

  if (!target) {
     console.warn('[HelpMe] No suitable editor found for stealth typing.');
     return;
  }

  target.focus();
  console.log('[HelpMe] Simulating stealth human typing...');

  // The actual simulation engine
  const lines = cleanCode.split('\n');
  
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    
    // Type characters one by one
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const keyCode = char.charCodeAt(0);
      
      const keydown = new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, keyCode, bubbles: true, cancelable: true });
      const keypress = new KeyboardEvent('keypress', { key: char, code: `Key${char.toUpperCase()}`, keyCode, bubbles: true, cancelable: true });
      const keyup = new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, keyCode, bubbles: true, cancelable: true });
      
      target.dispatchEvent(keydown);
      target.dispatchEvent(keypress);
      
      // Inject the actual value
      if (document.execCommand('insertText', false, char)) {
        // execCommand handled it
      } else if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        target.value += char;
        target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      } else if (target.isContentEditable) {
         target.innerText += char;
         target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }

      target.dispatchEvent(keyup);
      
      // Random delay between 15ms and 60ms for human-like speed
      const delay = Math.floor(Math.random() * 45) + 15;
      await new Promise(r => setTimeout(r, delay));
    }
    
    // Simulate pressing "Enter" at the end of a line (if not the last line)
    if (l < lines.length - 1) {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
      
      if (!document.execCommand('insertText', false, '\n')) {
        if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
           target.value += '\n';
           target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
      }
      
      target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
      
      // Slightly longer delay when jumping to a new line
      const lineDelay = Math.floor(Math.random() * 150) + 50;
      await new Promise(r => setTimeout(r, lineDelay));
    }
  }

  // Final confirmation event
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  console.log('[HelpMe] Stealth typing simulation complete!');
}



function enableSelectionBypass() {
  const css = `
    * {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
  `;
  const style = document.createElement('style');
  style.id = 'helpme-bypass-styles';
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



function autoClickAnswer(answer: string) {
  const norm = answer.trim().toLowerCase();
  const cleanAnswer = norm.replace(/^[a-da-d][),.]\s*/, '').trim();
  const letterMatch = answer.match(/^([a-dA-D])[),.]/);
  const letter = letterMatch ? letterMatch[1].toUpperCase() : null;

  console.log('[HelpMe] Attempting auto-click for:', { answer, cleanAnswer, letter });

  // 1. Precise Letter/Text Match in Labels/Buttons
  const allElements = document.querySelectorAll('button, input, label, div, span, li, a, [role="button"], [role="radio"]');
  
  let fallbackLetterElement: HTMLElement | null = null;
  
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
      if (letter && labelText === letter.toLowerCase()) {
        if (!fallbackLetterElement) fallbackLetterElement = element;
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
      if (elementText === letter.toLowerCase() && (element.tagName === 'DIV' || element.tagName === 'SPAN' || element.tagName === 'BUTTON' || element.tagName === 'LI')) {
        if (!fallbackLetterElement) fallbackLetterElement = element;
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

  // 3. Fallback: Exact Single Letter Detached Match
  if (fallbackLetterElement) {
    console.log('[HelpMe] Using detached exact-letter fallback for auto-click');
    fallbackLetterElement.click();
    return;
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
