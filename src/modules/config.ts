export const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1'];

export const DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash',
  openrouter: 'google/gemini-2.0-flash-001',
  groq: 'llama-3.3-70b-versatile',
};

export const REQUEST_TIMEOUT_MS = 20000;

/**
 * Highly optimized system prompt for an exam assistant.
 * Focuses on brevity, accuracy, and proper formatting.
 */
const SYSTEM_PROMPT = `You are a highly efficient exam assistant. 
Rules:
1. MCQ: Output ONLY the correct option and the answer text (e.g., "B) 42"). NO explanations.
2. Coding: Provide ONLY the source code. Wrap it in a single markdown code block. NEVER include comments like "Here is the code", "This script does...", or any conversational text.
3. Essay/Theory: Provide a concise, well-structured answer. Use bullet points for readability.
4. General: Be extremely brief. Minimize token usage. No conversational filler.
`;

export function buildFinalPrompt(userInput: string, mode?: 'mcq' | 'coding' | 'general'): string {
  const trimmed = userInput.trim();
  if (!trimmed) return '';
  
  if (mode === 'general') {
    return `${SYSTEM_PROMPT}\nQuestion:\n${trimmed}\nAnswer:`;
  }

  if (mode === 'mcq') {
    return `${SYSTEM_PROMPT}\nQuestion (MCQ):\n${trimmed}\nAnswer:`;
  }
  
  if (mode === 'coding') {
    return `${SYSTEM_PROMPT}\nProblem (Coding):\n${trimmed}\nFull Source Code:`;
  }

  // Detection logic for MCQ (broad: catches A) B) C) D), a. b. c., 1) 2) 3), Option A, etc.)
  const isMcq = /([A-Da-d][)\.]\s|Option\s*[A-D]|\n\s*[A-Da-d][)\.]|\n\s*\([A-Da-d]\)|\(a\)|\(b\)|\(c\)|\(d\))/m.test(trimmed);
  if (isMcq) return `${SYSTEM_PROMPT}\nQuestion (MCQ):\n${trimmed}\nAnswer:`;
  
  // Detection logic for Coding (strict: only multi-word phrases to avoid false positives)
  const isCoding = /(write a (program|function|script|code)|#include\s*<|public static void main|int main\s*\(|def\s+\w+\s*\(|print\s*\(|System\.out|scanf|printf|implement a|write code)/i.test(trimmed);
  if (isCoding) return `${SYSTEM_PROMPT}\nProblem (Coding):\n${trimmed}\nCode:`;

  return `${SYSTEM_PROMPT}\nQuestion:\n${trimmed}\nAnswer:`;
}

export function getOutputTokenLimit(prompt: string): number {
  if (/(program|code|implementation|essay|explain|problem)/i.test(prompt)) return 2048;
  return 128;
}
