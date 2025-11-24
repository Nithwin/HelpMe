/*
 * FILENAME: content.js
 * --------------------
 * This script is the main entry point for the extension's UI.
 * It is injected into every webpage the user visits.
 * Responsibilities:
 * 1. Create a host element and inject the React app into a Shadow DOM.
 * 2. Handle keyboard shortcuts from the background script.
 * 3. Manage the window's draggable functionality.
 * 4. Persist the window's position and transparency state.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../src/App'; // Adjust path if your structure differs

let container = null;
let shadowRoot = null;
const DEFAULTS = {
  position: { top: '20px', left: null, right: '20px' },
  isTransparent: true,
};

// --- Command Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.command) {
    case 'toggle-extension':
    case 'toggle-and-focus':
      toggleExtensionUI(request.command === 'toggle-and-focus');
      sendResponse({ status: "UI Toggled" });
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
  return true; // Keep the message channel open for async response
});

// --- UI Management ---
function toggleExtensionUI(focusInput = false) {
  if (!container) {
    createUI().then(() => {
        if (focusInput) {
            setTimeout(() => shadowRoot.querySelector('textarea')?.focus(), 100);
        }
    });
  } else {
    const isVisible = container.style.display === 'block';
    container.style.display = isVisible ? 'none' : 'block';
    if (!isVisible && focusInput) {
      setTimeout(() => shadowRoot.querySelector('textarea')?.focus(), 100);
    }
  }
}

async function createUI() {
  container = document.createElement('div');
  container.id = 'gemini-shadow-container';
  document.body.appendChild(container);

  const state = await chrome.storage.local.get(['position', 'isTransparent']);
  const currentPos = state.position || DEFAULTS.position;
  const isTransparent = state.isTransparent !== undefined ? state.isTransparent : DEFAULTS.isTransparent;

  Object.assign(container.style, {
    position: 'fixed',
    top: currentPos.top,
    right: currentPos.right,
    left: currentPos.left,
    width: '400px',
    height: '600px',
    zIndex: '2147483647',
    display: 'block',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'background-color 0.3s, backdrop-filter 0.3s, border 0.3s',
  });
  
  if (isTransparent) {
      container.classList.add('is-transparent');
  }

  shadowRoot = container.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Keep host background transparent so page shows through; avoid hard color values */
    :host(.is-transparent) {
      background-color: transparent;
    }
    :host(:not(.is-transparent)) {
      background-color: transparent;
    }
    #react-root { height: 100%; }
  `;
  shadowRoot.appendChild(styleEl);

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('assets/content.css');
  shadowRoot.appendChild(styleLink);
  
  const appRoot = document.createElement('div');
  appRoot.id = 'react-root';
  shadowRoot.appendChild(appRoot);

  ReactDOM.createRoot(appRoot).render(<React.StrictMode><App /></React.StrictMode>);

  setTimeout(() => {
    const header = shadowRoot.querySelector('.header');
    if (header) makeDraggable(container, header);
  }, 200);

  window.addEventListener('reset-gemini-position', resetPosition);
}

// --- Feature Logic ---
function resetPosition() {
  if (!container) return;
  Object.assign(container.style, {
    top: DEFAULTS.position.top,
    left: DEFAULTS.position.left,
    right: DEFAULTS.position.right
  });
  chrome.storage.local.set({ position: DEFAULTS.position });
}

function toggleTransparency() {
    if (!container) return;
    const isTransparent = container.classList.toggle('is-transparent');
    chrome.storage.local.set({ isTransparent });
}

function makeDraggable(element, handle) {
  let initialX, initialY, xOffset = 0, yOffset = 0;

  handle.onmousedown = (e) => {
    e.preventDefault();
    const rect = element.getBoundingClientRect();
    xOffset = rect.left;
    yOffset = rect.top;
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    document.onmousemove = dragElement;
    document.onmouseup = closeDragElement;
  };

  function dragElement(e) {
    e.preventDefault();
    const newX = e.clientX - initialX;
    const newY = e.clientY - initialY;

    // Constrain movement within the viewport
    const newTop = Math.max(0, Math.min(newY, window.innerHeight - element.offsetHeight));
    const newLeft = Math.max(0, Math.min(newX, window.innerWidth - element.offsetWidth));

    element.style.top = `${newTop}px`;
    element.style.left = `${newLeft}px`;
    element.style.right = 'auto';
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    chrome.storage.local.set({ 
        position: { top: element.style.top, left: element.style.left, right: null } 
    });
  }
}

// --- Cross-Browser Shortcut Fallback ---
// Some older system/browser setups fail to dispatch extension commands
// (e.g. Ctrl+Space / Command+Space intercepted by OS). We add a direct
// key listener here as a resilient fallback so the UI still toggles.
if (!window.__geminiShortcutListenerAdded) {
  window.__geminiShortcutListenerAdded = true;
  window.addEventListener('keydown', (e) => {
    // Ignore if typing inside our shadow UI
    if (shadowRoot && shadowRoot.contains(e.target)) return;
    // Basic checks (avoid auto-repeat flicker)
    if (e.repeat) return;
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    const spacePressed = (e.code === 'Space') || (e.key === ' ') || (e.key === 'Spacebar') || (e.keyCode === 32);
    if (ctrlOrMeta && spacePressed) {
      // Prevent page scrolling or other handlers
      e.preventDefault();
      toggleExtensionUI(true);
    }
  }, true); // capture phase to beat page handlers
}
