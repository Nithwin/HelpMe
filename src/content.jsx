/*
 * FILENAME: content.js
 * --------------------
 * This script is the main entry point for the extension's UI.
 * It is injected into every webpage the user visits.
 *
 * Responsibilities:
 * 1. Create a host element on the page for our UI.
 * 2. Attach a Shadow DOM to the host element to isolate our UI from the host page.
 * 3. Inject the React application into this Shadow DOM.
 * 4. Listen for messages from the background script to toggle the UI's visibility.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Your main React App component
import './content.css'; // Your CSS file


let root = null;
let container = null;

function toggleExtensionUI() {
  if (container) {
    const isVisible = container.style.display === 'block';
    container.style.display = isVisible ? 'none' : 'block';
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'toggle-extension') {
    // If the UI hasn't been created yet, create it.
    if (!container) {
      createUI();
    }
    toggleExtensionUI();
    sendResponse({ status: "UI Toggled" });
  } else if (request.command === 'reset-chat') {
    // Forward the reset command to the App component if it exists
    if (container) {
        // We can't use postMessage anymore, so we'll use a custom event
        window.dispatchEvent(new CustomEvent('reset-gemini-chat'));
    }
    sendResponse({ status: "Reset command dispatched" });
  }
  return true;
});


function createUI() {
  // 1. Create the main container that will be attached to the page's body
  container = document.createElement('div');
  container.id = 'gemini-shadow-container';
  document.body.appendChild(container);

  // 2. Attach the Shadow DOM to our container
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // 3. Create the root element inside the Shadow DOM where our React app will be rendered
  const appRoot = document.createElement('div');
  appRoot.id = 'react-root';
  shadowRoot.appendChild(appRoot);

  // 4. Inject the extension's CSS into the Shadow DOM
  // We need to do this because styles from the main page do not pierce the shadow DOM
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('assets/content.css'); // Get URL from our extension package
  shadowRoot.appendChild(styleLink);
  
  // 5. Render the React App inside the shadow DOM's root element
  root = ReactDOM.createRoot(appRoot);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Apply initial styles to the container
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '400px',
    height: '500px',
    zIndex: '9999999',
    display: 'none', // Start hidden
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden' // Hide anything that might overflow the container
  });
}

// Note: To handle the reset command, your App.js would need a slight modification:
//
// In App.js, add this useEffect:
//
// useEffect(() => {
//   const handleReset = () => {
//     setPrompt('');
//     setResponse('');
//   };
//   window.addEventListener('reset-gemini-chat', handleReset);
//   return () => window.removeEventListener('reset-gemini-chat', handleReset);
// }, []);
//