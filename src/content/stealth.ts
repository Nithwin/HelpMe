export async function stealthTypeCode(code: string) {
  const cleanCode = code.replace(/```[\w]*\n?|```/g, '').trim();
  let target = document.activeElement as HTMLElement;
  
  const selectors = [
    'textarea', '[contenteditable="true"]', '.ace_text-input', 
    '.monaco-mouse-cursor-text', '.cm-content', '.inputarea',
    '[role="textbox"]', '.view-lines', '.css-153p9ug'
  ];

  if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement || target.isContentEditable)) {
    const editors = document.querySelectorAll(selectors.join(','));
    if (editors.length > 0) target = editors[0] as HTMLElement;
  }

  if (!target) return;
  target.focus();

  // ShadowCode Placeholder Detection
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
     // For contentEditable, we need to find the text node containing the placeholder
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

  console.log(`[ExamPilot] Stealth typing (ShadowCode: ${hasPlaceholder})...`);

  const lines = cleanCode.split('\n');
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const keyCode = char.charCodeAt(0);
      
      const keydown = new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, keyCode, bubbles: true, cancelable: true });
      const keypress = new KeyboardEvent('keypress', { key: char, code: `Key${char.toUpperCase()}`, keyCode, bubbles: true, cancelable: true });
      const keyup = new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, keyCode, bubbles: true, cancelable: true });
      
      target.dispatchEvent(keydown);
      target.dispatchEvent(keypress);
      
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        target.setRangeText(char, start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
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
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      target.dispatchEvent(keyup);
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 45) + 15));
    }
    
    if (l < lines.length - 1) {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
      
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        target.setRangeText('\n', start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target.isContentEditable) {
         document.execCommand('insertLineBreak');
      }
      
      target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 150) + 50));
    }
  }

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
