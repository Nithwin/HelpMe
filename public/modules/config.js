export const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1'];

export const DEFAULT_MODELS = {
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'],
  openrouter: ['openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct'],
  groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
};

export const OUTPUT_TOKEN_BUDGETS = {
  direct: 64,
  mcq: 24,
  coding: 512,
};

export const REQUEST_TIMEOUT_MS = 15000;
export const MAX_RETRIES = 1;

export function getOutputTokenLimit(answerMode) {
  return OUTPUT_TOKEN_BUDGETS[answerMode] || OUTPUT_TOKEN_BUDGETS.direct;
}

export function compactPrompt(prompt, answerMode) {
  const text = String(prompt || '').trim();
  if (!text) return '';

  if (answerMode === 'coding') {
    return text.slice(0, 9000);
  }

  return text.replace(/\s+/g, ' ').slice(0, 1800);
}

export function getAnswerStyleInstructions(answerMode) {
  if (answerMode === 'mcq') {
    return 'MCQ mode. Return exactly one line: <option>) <answer>. No explanation.';
  }

  if (answerMode === 'coding') {
    return 'Coding mode. Return complete solution in one markdown code block. Add one final line for time/space complexity.';
  }

  return 'Direct mode. Return final answer only. No explanation.';
}

export function buildFinalPrompt(prompt, answerMode) {
  const compactInput = compactPrompt(prompt, answerMode);
  const instructions = getAnswerStyleInstructions(answerMode);
  return `${instructions}\nQ: ${compactInput}`;
}
