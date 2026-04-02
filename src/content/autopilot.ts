export function clickNextButton() {
     console.log('[ExamPilot] Searching for Next button...');
     const buttons = document.querySelectorAll('button, a, input[type="submit"], input[type="button"], div[role="button"], span[role="button"]');
     
     // 1. Expanded pool of "Next" keywords across different cases and formats
     const nextKeywords = [
        'next', 'next >', 'save & next', 'save and next', 
        'submit and next', 'continue', 'proceed', 'finish', 
        'submit answer', '→', 'next question', 'got it',
        'confirm', 'save', 'submit', 'move on'
     ];
     
     for (const btn of Array.from(buttons)) {
        const element = btn as HTMLElement;
        const text = (element.textContent || (element as HTMLInputElement).value || element.getAttribute('aria-label') || element.title || '').trim().toLowerCase();
        
        // Match exact keyword OR if the text includes a long keyword (e.g. "Proceed to Next")
        const isNext = nextKeywords.some(kw => text === kw || (kw.length > 3 && text.includes(kw)));
        
        // Also check classes for "next", "btn-next", etc.
        const hasNextClass = Array.from(element.classList).some(c => {
           const classLower = c.toLowerCase();
           return classLower.includes('next') || classLower.includes('primary') || classLower.includes('submit');
        });

        if (isNext || hasNextClass) {
            console.log('[ExamPilot] ✅ Found Next Button:', element);
            element.click();
            return true;
        }
     }
     
     // 2. Secondary: Search for icons/SVG that might be "Next"
     const svgs = document.querySelectorAll('svg');
     for (const svg of Array.from(svgs)) {
        const parent = svg.parentElement;
        if (parent && (parent.tagName === 'BUTTON' || parent.getAttribute('role') === 'button')) {
           const label = (parent.getAttribute('aria-label') || parent.title || '').toLowerCase();
           if (label.includes('next') || label.includes('proceed')) {
              parent.click();
              return true;
           }
        }
     }

     console.warn('[ExamPilot] ❌ No Next Button found.');
     return false;
}

export function startAutopilotLoop(active: boolean) {
    if (!active) return;
    console.log('[ExamPilot] Autopilot Loop: Extracting question text...');
    
    // Attempt to find the most relevant question area instead of just body
    constSelectors = ['.question-content', '.problem-description', '.question-body', '#question-text', '.css-1017e8m'];
    let questionArea: HTMLElement | null = null;
    for (const sel of constSelectors) {
       questionArea = document.querySelector(sel);
       if (questionArea) break;
    }

    // fallback to body if no specific area found
    const textToScan = questionArea ? questionArea.innerText : document.body.innerText;
    
    window.dispatchEvent(new CustomEvent('gemini-ask-selection', { 
       detail: { text: textToScan, mode: 'mcq' } 
    }));
}
