export function clickNextButton() {
     console.log('[ExamPilot] Searching for Next button...');
     const buttons = document.querySelectorAll('button, a, input[type="submit"], input[type="button"], div[role="button"], span[role="button"]');
     
     // 1. Prioritize buttons with clear "Next" text or common "Next" classes
     const nextKeywords = ['next', 'next >', 'save & next', 'submit and next', 'continue', 'proceed', 'finish', 'submit answer', '→'];
     
     for (const btn of Array.from(buttons)) {
        const element = btn as HTMLElement;
        const text = (element.textContent || (element as HTMLInputElement).value || element.getAttribute('aria-label') || element.title || '').trim().toLowerCase();
        
        const isNext = nextKeywords.some(kw => text === kw || (kw.length > 3 && text.includes(kw)));
        const hasNextClass = Array.from(element.classList).some(c => c.toLowerCase().includes('next') || c.toLowerCase().includes('btn-primary'));

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
           const label = parent.getAttribute('aria-label') || '';
           if (label.toLowerCase().includes('next')) {
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
    
    const mainContentText = document.body.innerText;
    
    window.dispatchEvent(new CustomEvent('gemini-ask-selection', { 
       detail: { text: mainContentText, mode: 'mcq' } 
    }));
}
