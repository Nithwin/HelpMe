import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';

const extApi = (globalThis as any).browser ?? (globalThis as any).chrome;

export async function createUI(initialDisplay: 'block' | 'none' = 'block') {
  const container = document.createElement('div');
  container.id = 'exampilot-shadow-container';
  document.body.appendChild(container);

  const storage = (extApi && extApi.storage) ? (extApi.storage.sync || extApi.storage.local) : null;
  const state = storage ? await storage.get(['position', 'isTransparent']) : {};
  const currentPos = state.position || { top: '20px', right: '20px' };
  const isTransparent = state.isTransparent !== undefined ? state.isTransparent : true;

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
  
  if (isTransparent) container.classList.add('is-transparent');

  const shadowRoot = container.attachShadow({ mode: 'open' });

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

  return { container, shadowRoot };
}

export function makeDraggable(element: HTMLElement, handle: HTMLElement) {
    let initialX: number, initialY: number, xOffset = 0, yOffset = 0;
    const storage = extApi.storage.sync || extApi.storage.local;

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
        storage.set({ 
            position: { top: element.style.top, left: element.style.left, right: null } 
        });
    }
}
