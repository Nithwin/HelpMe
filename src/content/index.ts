import { createUI, makeDraggable } from './ui';
import { enableSelectionBypass } from './bypass';
import { autoClickAnswer } from './mcq';
import { stealthTypeCode } from './stealth';
import { clickNextButton, startAutopilotLoop } from './autopilot';

const extApi = (globalThis as any).browser ?? (globalThis as any).chrome;

// Safety check for extension context
const isExtensionContext = !!(extApi && extApi.runtime && extApi.runtime.id);

let container: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let latestCodeSolution = '';
let autopilotActive = false;

const DEFAULTS = {
  position: { top: '20px', left: null as string | null, right: '20px' },
  isTransparent: true,
};

// --- Command Listener ---
extApi.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  switch (request.command) {
    case 'toggle-extension':
    case 'toggle-and-focus':
      toggleUI(request.command === 'toggle-and-focus');
      break;
    case 'ask-selection':
    case 'ask-mcq-auto':
    case 'ask-coding-auto':
      handleShortcutAsk(request.command);
      break;
    case 'reset-chat':
      window.dispatchEvent(new CustomEvent('reset-gemini-chat'));
      break;
    case 'reset-position':
      resetPosition();
      break;
    case 'toggle-transparency':
      toggleTransparency();
      break;
  }
  sendResponse({ status: "ok" });
  return true;
});

async function toggleUI(focusInput = false) {
  if (!container) {
    const ui = await createUI('block');
    container = ui.container;
    shadowRoot = ui.shadowRoot;
    setupModules();
    if (focusInput) setTimeout(() => focusTextArea(), 150);
  } else {
    const isVisible = container.style.display === 'block';
    container.style.display = isVisible ? 'none' : 'block';
    if (!isVisible && focusInput) setTimeout(() => focusTextArea(), 150);
  }
}

function focusTextArea() {
  const textarea = shadowRoot?.querySelector('textarea');
  if (textarea) (textarea as HTMLElement).focus();
}

async function handleShortcutAsk(command: string) {
  let text = window.getSelection()?.toString().trim();
  const mode = command === 'ask-mcq-auto' ? 'mcq' : command === 'ask-coding-auto' ? 'coding' : 'general';

  // If no selection and MCQ, attempt auto-extraction of current question
  if (!text && mode === 'mcq') {
    console.log('[ExamPilot] No selection, attempting auto-extraction...');
    const selectors = ['.question-content', '.problem-description', '.question-body', '#question-text', '.css-1017e8m'];
    let area: HTMLElement | null = null;
    for (const sel of selectors) {
      area = document.querySelector(sel);
      if (area) break;
    }
    text = area ? area.innerText : document.body.innerText;
  }

  if (!text) return;

  if (mode === 'general') {
    await toggleUI(true);
  } else {
    if (!container) {
      const ui = await createUI('none');
      container = ui.container;
      shadowRoot = ui.shadowRoot;
      setupModules();
    }
  }
  
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('gemini-ask-selection', { 
      detail: { text, mode } 
    }));
  }, 500);
}

function setupModules() {
  if (!container || !shadowRoot) return;

  // Initialize Draggable
  setTimeout(() => {
    const header = shadowRoot?.querySelector('.app-header');
    if (header && container) makeDraggable(container, header as HTMLElement);
  }, 800);

  // Initialize Selection Bypass
  enableSelectionBypass(container);

  // Listen for reset events from React
  window.addEventListener('reset-gemini-position', resetPosition);

  // Suppress Monaco Search/Replace Widget
  const style = document.createElement('style');
  style.id = 'exampilot-monaco-suppressor';
  style.textContent = `
    .monaco-editor .find-widget,
    .monaco-editor .find-widget.visible,
    .monaco-editor .replace-widget {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

// --- Global Event Listeners ---

// MCQ Auto-Select Listener
window.addEventListener('gemini-select-answer', (e: any) => {
  const answer = e.detail;
  if (!answer) return;
  
  if (!isExtensionContext) {
    autoClickAnswer(answer);
    return;
  }

  const storage = extApi.storage.sync || extApi.storage.local;
  storage.get(['autoDelay']).then((res: any) => {
    const waitTime = (res.autoDelay !== false) ? Math.floor(Math.random() * 2000) + 1000 : 0;
    setTimeout(() => {
       autoClickAnswer(answer);
       
       if (autopilotActive) {
          console.log('[ExamPilot] Answer clicked. Waiting before moving to next question.');
          setTimeout(() => {
             if (autopilotActive) {
                clickNextButton();
                setTimeout(() => {
                   if (autopilotActive) startAutopilotLoop(true);
                }, 4000);
             }
          }, 2500);
       }
    }, waitTime);
  });
});

// Coding Store Listener (from Alt+C)
window.addEventListener('gemini-store-code', (e: any) => {
  latestCodeSolution = e.detail;
  console.log('[ExamPilot] Code solution stored. Press Alt+V to stealth type it.');
});

// Unified Keydown Listener (Alt+V, Alt+Z, Ctrl+Space fallback)
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.altKey && e.code === 'KeyV') {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (latestCodeSolution) {
      stealthTypeCode(latestCodeSolution);
    } else {
      console.warn('[ExamPilot] No code stored. Press Alt+C first.');
    }
  }
  
  if (e.altKey && e.code === 'KeyZ') {
    e.preventDefault();
    e.stopImmediatePropagation();
    autopilotActive = !autopilotActive;
    console.log(`[ExamPilot] ✈️ Autopilot ${autopilotActive ? 'ENGAGED' : 'DISENGAGED'}.`);
    if (autopilotActive) startAutopilotLoop(true);
  }

  // Ctrl+Space fallback
  const ctrlOrMeta = e.ctrlKey || e.metaKey;
  const spacePressed = (e.code === 'Space') || (e.key === ' ') || (e.keyCode === 32);
  if (ctrlOrMeta && spacePressed) {
    e.preventDefault();
    toggleUI(true);
  }

  // Block Monaco Find/Replace shortcuts
  if (ctrlOrMeta && (e.code === 'KeyF' || e.code === 'KeyH')) {
    const target = e.target as HTMLElement;
    if (target.closest('.monaco-editor') || target.tagName === 'TEXTAREA') {
       e.preventDefault();
       e.stopImmediatePropagation();
    }
  }
}, true);

// Support Functions
async function resetPosition() {
  if (!container) return;
  Object.assign(container.style, {
    top: DEFAULTS.position.top,
    left: DEFAULTS.position.left,
    right: DEFAULTS.position.right
  });
  if (isExtensionContext) {
    const storage = extApi.storage.sync || extApi.storage.local;
    await storage.set({ position: DEFAULTS.position });
  }
}

async function toggleTransparency() {
  if (!container) return;
  const isTransparent = container.classList.toggle('is-transparent');
  if (isExtensionContext) {
    const storage = extApi.storage.sync || extApi.storage.local;
    await storage.set({ isTransparent });
  }
}
