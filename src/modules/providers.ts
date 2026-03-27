import { DEFAULT_MODELS } from './config';
import { isModelFailure, performRequestWithRetry } from './network';

export interface AIResponse {
  success: boolean;
  text: string;
  model?: string;
  error?: string;
  provider?: string;
}

interface FetchParams {
  apiKey: string;
  prompt: string;
  requestedModel?: string;
  maxOutputTokens: number;
}

async function readResultByProvider(response: Response, provider: string): Promise<string | undefined> {
  const data = await response.json();
  if (provider === 'gemini') {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text;
  }
  return data?.choices?.[0]?.message?.content;
}

export async function fetchGemini({ apiKey, prompt, requestedModel, maxOutputTokens }: FetchParams): Promise<AIResponse> {
  const cleanRequested = requestedModel ? requestedModel.replace(/^models\//, '') : '';
  // Fallback to a single default if requested is empty
  const model = cleanRequested || DEFAULT_MODELS.gemini;
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const requestResult = await performRequestWithRetry((fetchWithTimeout) =>
    fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          topP: 0.8,
          maxOutputTokens,
        },
      }),
    })
  );

  if (!requestResult.ok) {
    if (requestResult.networkError) {
      return { success: false, text: '', error: `Gemini network error: ${requestResult.networkError.message}` };
    }
    return { success: false, text: '', error: `Gemini error ${requestResult.status}: ${requestResult.errText}` };
  }

  const text = await readResultByProvider(requestResult.response!, 'gemini');
  return {
    success: true,
    text: text || 'No content returned.',
    model,
  };
}

export async function fetchOpenRouter({ apiKey, prompt, requestedModel, maxOutputTokens }: FetchParams): Promise<AIResponse> {
  const model = requestedModel || DEFAULT_MODELS.openrouter;

  const requestResult = await performRequestWithRetry((fetchWithTimeout) =>
    fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/HelpMe',
        'X-Title': 'HelpMe Exam Portal Assistant',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        top_p: 0.8,
        max_tokens: maxOutputTokens,
      }),
    })
  );

  if (!requestResult.ok) {
    if (requestResult.networkError) {
      return { success: false, text: '', error: `OpenRouter network error: ${requestResult.networkError.message}` };
    }
    return { success: false, text: '', error: `OpenRouter error ${requestResult.status}: ${requestResult.errText}` };
  }

  const text = await readResultByProvider(requestResult.response!, 'openrouter');
  return {
    success: true,
    text: text || 'No content returned.',
    model,
  };
}

export async function fetchGroq({ apiKey, prompt, requestedModel, maxOutputTokens }: FetchParams): Promise<AIResponse> {
  const model = requestedModel || DEFAULT_MODELS.groq;

  const requestResult = await performRequestWithRetry((fetchWithTimeout) =>
    fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        top_p: 0.8,
        max_tokens: maxOutputTokens,
      }),
    })
  );

  if (!requestResult.ok) {
    if (requestResult.networkError) {
      return { success: false, text: '', error: `Groq network error: ${requestResult.networkError.message}` };
    }
    return { success: false, text: '', error: `Groq error ${requestResult.status}: ${requestResult.errText}` };
  }

  const text = await readResultByProvider(requestResult.response!, 'groq');
  return {
    success: true,
    text: text || 'No content returned.',
    model,
  };
}
