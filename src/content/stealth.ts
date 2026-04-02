export async function stealthTypeCode(code: string) {
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
     console.warn('[ExamPilot] No suitable editor found for stealth typing.');
     return;
  }

  target.focus();
  console.log('[ExamPilot] Simulating stealth human typing at cursor...');

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
      
      // FIX: Use modern APIs for cursor-aware insertion
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        // setRangeText inserts exactly at the selection/cursor
        target.setRangeText(char, start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target.isContentEditable) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents(); // Replace selection if any
          const textNode = document.createTextNode(char);
          range.insertNode(textNode);
          // Move cursor after the inserted character
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          sel.removeAllRanges();
          sel.addRange(range);
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
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
      
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        target.setRangeText('\n', start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target.isContentEditable) {
         // For contentEditable, Enter usually needs a <br> or \n depending on the site
         document.execCommand('insertLineBreak');
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
}
