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
2. Coding: Provide ONLY the code in a single markdown block. NO preface/summary. Ensure clean formatting.
3. Essay/Theory: Provide a concise, well-structured answer. Use bullet points for readability.
4. General: Be extremely brief. Minimize token usage. No conversational filler ("Here is the answer...", "I hope this helps").
`;

export function buildFinalPrompt(userInput: string): string {
  const trimmed = userInput.trim();
  if (!trimmed) return '';
  
  // Detection logic for MCQ
  const isMcq = /([A-D]\)|[1-4]\)|Option [A-D])/.test(trimmed);
  
  if (isMcq) {
    return `${SYSTEM_PROMPT}\nQuestion (MCQ):\n${trimmed}\nAnswer:`;
  }
  
  // Detection logic for Coding
  const isCoding = /(Write a program|function|class|algorithm|code|implementation|#include|<iostream>|def |public static void main)/i.test(trimmed);
  
  if (isCoding) {
    return `${SYSTEM_PROMPT}\nProblem (Coding):\n${trimmed}\nCode:`;
  }

  return `${SYSTEM_PROMPT}\nQuestion:\n${trimmed}\nAnswer:`;
}

export function getOutputTokenLimit(prompt: string): number {
  if (/(program|code|implementation|essay|explain)/i.test(prompt)) return 1024;
  return 128;
}
