/*
 * FILENAME: content.js
 * --------------------
 * This script is the main entry point for the extension's UI.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

let root = null;
let container = null;
let shadowRoot = null;

function toggleExtensionUI(focusInput = false) {
  if (!container) {
    createUI();
  }
  
  const isVisible = container.style.display === 'block';
  container.style.display = isVisible ? 'none' : 'block';

  // If we are making it visible and should focus, find the textarea
  if (!isVisible && focusInput) {
    // We need a slight delay for the element to be fully rendered and available
    setTimeout(() => {
        const textarea = shadowRoot.querySelector('textarea');
        if (textarea) {
            textarea.focus();
        }
    }, 100);
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'toggle-extension') {
    toggleExtensionUI(false);
    sendResponse({ status: "UI Toggled" });
  } else if (request.command === 'toggle-and-focus') {
    toggleExtensionUI(true);
    sendResponse({ status: "UI Toggled and Focused" });
  } else if (request.command === 'reset-chat') {
    if (container) {
      window.dispatchEvent(new CustomEvent('reset-gemini-chat'));
    }
    sendResponse({ status: "Reset command dispatched" });
  }
  return true;
});

function createUI() {
  container = document.createElement('div');
  container.id = 'gemini-shadow-container';
  document.body.appendChild(container);

  shadowRoot = container.attachShadow({ mode: 'open' });

  const appRoot = document.createElement('div');
  appRoot.id = 'react-root';
  shadowRoot.appendChild(appRoot);

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('assets/content.css');
  shadowRoot.appendChild(styleLink);

  root = ReactDOM.createRoot(appRoot);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '400px',
    height: '600px', // Increased height for better usability
    zIndex: '2147483647', // Max z-index
    display: 'none',
    border: '1px solid #444',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    backgroundColor: '#1e1e1e', // Match App's background
    fontFamily: `'Inter', sans-serif`,
  });
}