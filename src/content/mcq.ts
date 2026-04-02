export function autoClickAnswer(answer: string) {
  const norm = answer.trim().toLowerCase();
  
  // 1. Extract Letter and Clean Answer Text
  // Matches "A) Monkey", "A. Monkey", "(A) Monkey", or just "A"
  const letterMatch = answer.match(/^\(?([a-dA-D])[\s\)\.]/i) || answer.match(/^([a-dA-D])$/i);
  const letter = letterMatch ? letterMatch[1].toUpperCase() : null;
  
  // Strip off prefixes like "A) " or "Answer: " to get just the text
  let cleanAnswer = norm.replace(/^(answer:?\s*)?\(?[a-d][\s\)\.]{1,2}/i, '').trim();
  
  // If the answer was just "A", cleanAnswer might be empty or "a"
  if (cleanAnswer.toLowerCase() === letter?.toLowerCase()) cleanAnswer = '';

  console.log('[ExamPilot] Auto-Click Debug:', { original: answer, letter, cleanAnswer });

  // 2. Scan all potentially clickable elements
  const allElements = document.querySelectorAll('button, input, label, div, span, li, a, [role="button"], [role="radio"]');
  let fallbackLetterElement: HTMLElement | null = null;
  
  for (const el of Array.from(allElements)) {
    const element = el as HTMLElement;
    const text = (element.textContent || (element as HTMLInputElement).value || '').trim();
    const elementText = text.toLowerCase();
    
    // Check for radio/checkbox inputs specifically
    if (element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')) {
      const parentLabel = element.closest('label');
      const associatedLabel = document.querySelector(`label[for="${element.id}"]`);
      const labelText = (parentLabel?.textContent || associatedLabel?.textContent || '').trim().toLowerCase();
      
      // Try matching by the actual text first
      if (cleanAnswer && labelText.includes(cleanAnswer) && cleanAnswer.length > 2) {
        console.log('[ExamPilot] Match by label text:', labelText);
        element.click();
        return;
      }
      // Try matching by letter prefix in label
      if (letter && (labelText.startsWith(letter.toLowerCase()) || labelText.includes(`${letter.toLowerCase()}.`) || labelText.includes(`${letter.toLowerCase()})`))) {
         console.log('[ExamPilot] Match by letter in label:', labelText);
         element.click();
         return;
      }
    }

    // Try matching generic clickable elements by exact text
    if (cleanAnswer && elementText === cleanAnswer) {
      console.log('[ExamPilot] Match by exact text:', elementText);
      element.click();
      return;
    }
    
    // Track detached letter buttons (buttons whose only text is "A", "B", etc.)
    if (letter) {
      const isDetachedLetter = elementText === letter.toLowerCase() || 
                               elementText === `${letter.toLowerCase()}.` || 
                               elementText === `${letter.toLowerCase()})` ||
                               elementText === `(${letter.toLowerCase()})`;
      
      if (isDetachedLetter) {
        // Prefer explicit buttons/inputs over generic divs
        const isClickableTag = ['BUTTON', 'INPUT', 'LABEL', 'LI', 'A'].includes(element.tagName);
        if (isClickableTag || !fallbackLetterElement) {
           fallbackLetterElement = element;
        }
      }
      
      // Regex match for "A) Some Text" inside a button
      const prefixRegex = new RegExp(`^\\(?${letter}[\\.\\)\\s]`, 'i');
      if (prefixRegex.test(text)) {
        console.log('[ExamPilot] Match by letter prefix regex:', text);
        element.click();
        return;
      }
    }
  }

  // 3. Deep Heuristic Content Match (If text is at least 4 chars long)
  if (cleanAnswer && cleanAnswer.length > 3) {
    for (const el of Array.from(allElements)) {
      const element = el as HTMLElement;
      const text = (element.innerText || element.textContent || '').trim().toLowerCase();
      if (text.includes(cleanAnswer) || cleanAnswer.includes(text)) {
         console.log('[ExamPilot] Heuristic match:', text);
         element.click();
         return;
      }
    }
  }

  // 4. Fallback: Click the detached letter element if found
  if (fallbackLetterElement) {
    console.log('[ExamPilot] Detached letter fallback click:', fallbackLetterElement.textContent);
    fallbackLetterElement.click();
    return;
  }
}
