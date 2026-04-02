export async function stealthTypeCode(code: string) {
  // 1. Strip markdown code blocks if present
  const cleanCode = code.replace(/```[\w]*\n?|```/g, '').trim();
  
  // 2. Find target: active element or best guess editor
  let target = document.activeElement as HTMLElement;
  
  const selectors = [
    'textarea.inputarea', // Monaco (LeetCode/HackerRank)
    'textarea', 
    '[contenteditable="true"]', 
    '.ace_text-input', 
    '.cm-content', 
    '.inputarea',
    '[role="textbox"]',
    '.view-lines',
    '.css-153p9ug' // Specific LeetCode editor wrapper
  ];

  // If active is not a valid text-entry element, search for the biggest textarea or editor
  if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement || target.isContentEditable)) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        target = el as HTMLElement;
        break;
      }
    }
  }

  if (!target) {
     console.warn('[ExamPilot] No suitable editor found for stealth typing.');
     return;
  }

  target.focus();

  // 3. ShadowCode Placeholder Detection & Selection
  const PLACEHOLDER = 'shadowcode';
  let hasPlaceholder = false;

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
     const val = target.value;
     const index = val.toLowerCase().indexOf(PLACEHOLDER);
     if (index !== -1) {
        target.setSelectionRange(index, index + PLACEHOLDER.length);
        hasPlaceholder = true;
     }
  } else if (target.isContentEditable) {
     const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null);
     let node;
     while (node = walker.nextNode()) {
        const index = node.nodeValue?.toLowerCase().indexOf(PLACEHOLDER) ?? -1;
        if (index !== -1) {
           const range = document.createRange();
           range.setStart(node, index);
           range.setEnd(node, index + PLACEHOLDER.length);
           const sel = window.getSelection();
           sel?.removeAllRanges();
           sel?.addRange(range);
           hasPlaceholder = true;
           break;
        }
     }
  }

  console.log(`[ExamPilot] 🚀 Executing Ultimate Stealth Typing (Placeholder: ${hasPlaceholder})...`);

  // 4. Typing Loop
  const lines = cleanCode.split('\n');
  
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const keyCode = char.charCodeAt(0);
      
      // A. Keyboard Event Simulation (The "Stealth" layer)
      const commonConfig = { key: char, code: `Key${char.toUpperCase()}`, keyCode, bubbles: true, cancelable: true };
      target.dispatchEvent(new KeyboardEvent('keydown', commonConfig));
      target.dispatchEvent(new KeyboardEvent('keypress', commonConfig));
      
      // B. Multi-Layer Injection (The "Workhorse" layer)
      let injected = false;

      // Layer 1: Native Inserter (Best for compatibility)
      try {
        if (document.execCommand('insertText', false, char)) {
          injected = true;
        } else if (document.execCommand('insertHTML', false, char)) {
          injected = true;
        }
      } catch (e) { /* ignore */ }

      // Layer 2: Selection/Range Fallback
      if (!injected) {
        if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
          const start = target.selectionStart || 0;
          const end = target.selectionEnd || 0;
          target.setRangeText(char, start, end, 'end');
          injected = true;
        } else if (target.isContentEditable) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(char);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            sel.removeAllRanges();
            sel.addRange(range);
            injected = true;
          }
        }
      }

      // C. Change/Input Event Simulation (The "Reactive" layer)
      // Dispatched even if Layer 1/2 succeeded to trigger React/Vue listeners
      target.dispatchEvent(new InputEvent('beforeinput', { data: char, inputType: 'insertText', bubbles: true, cancelable: true }));
      target.dispatchEvent(new InputEvent('input', { data: char, inputType: 'insertText', bubbles: true }));
      target.dispatchEvent(new KeyboardEvent('keyup', commonConfig));

      // Human-like speed: 15ms - 60ms
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 45) + 15));
    }
    
    // Line-break handling
    if (l < lines.length - 1) {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
      
      let newlineInjected = false;
      try {
        if (document.execCommand('insertLineBreak')) newlineInjected = true;
        else if (document.execCommand('insertText', false, '\n')) newlineInjected = true;
      } catch (e) { /* ignore */ }

      if (!newlineInjected) {
        if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
          const start = target.selectionStart || 0;
          const end = target.selectionEnd || 0;
          target.setRangeText('\n', start, end, 'end');
        }
      }
      
      target.dispatchEvent(new InputEvent('input', { data: '\n', inputType: 'insertLineBreak', bubbles: true }));
      target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      
      // Longer delay for new lines
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 150) + 50));
    }
  }

  // Final change event to ensure data sync
  target.dispatchEvent(new Event('change', { bubbles: true }));
  console.log('[ExamPilot] ✅ Stealth typing cycle complete!');
}
