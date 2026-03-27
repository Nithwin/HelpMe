import { DEFAULT_MODELS } from './config.js';
import { isModelFailure, performRequestWithRetry } from './network.js';

async function readResultByProvider(response, provider) {
  const data = await response.json();
  if (provider === 'gemini') {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text;
  }
  return data?.choices?.[0]?.message?.content;
}

export async function fetchGemini({ apiKey, prompt, requestedModel, maxOutputTokens }) {
  const cleanRequested = requestedModel ? requestedModel.replace(/^models\//, '') : '';
  const models = [cleanRequested, ...DEFAULT_MODELS.gemini].filter(Boolean);
  const attempted = [];

  for (const model of [...new Set(models)]) {
    attempted.push(model);
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
        return { success: false, error: `Gemini network error: ${requestResult.networkError.message}` };
      }

      if (isModelFailure(requestResult.status, requestResult.errText)) {
        continue;
      }

      return { success: false, error: `Gemini error ${requestResult.status}: ${requestResult.errText}` };
    }

    const text = await readResultByProvider(requestResult.response, 'gemini');
    return {
      success: true,
      text: text || 'No content returned.',
      model,
    };
  }

  return {
    success: false,
    error: `Gemini model not found. Attempted: ${attempted.join(', ')}`,
  };
}

export async function fetchOpenRouter({ apiKey, prompt, requestedModel, maxOutputTokens }) {
  const models = [requestedModel, ...DEFAULT_MODELS.openrouter].filter(Boolean);
  const attempted = [];

  for (const model of [...new Set(models)]) {
    attempted.push(model);

    const requestResult = await performRequestWithRetry((fetchWithTimeout) =>
      fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://localhost',
          'X-Title': 'HelpMe Practice Assistant',
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
        return { success: false, error: `OpenRouter network error: ${requestResult.networkError.message}` };
      }

      if (isModelFailure(requestResult.status, requestResult.errText)) {
        continue;
      }

      return { success: false, error: `OpenRouter error ${requestResult.status}: ${requestResult.errText}` };
    }

    const text = await readResultByProvider(requestResult.response, 'openrouter');
    return {
      success: true,
      text: text || 'No content returned.',
      model,
    };
  }

  return {
    success: false,
    error: `OpenRouter model not found. Attempted: ${attempted.join(', ')}`,
  };
}

export async function fetchGroq({ apiKey, prompt, requestedModel, maxOutputTokens }) {
  const models = [requestedModel, ...DEFAULT_MODELS.groq].filter(Boolean);
  const attempted = [];

  for (const model of [...new Set(models)]) {
    attempted.push(model);

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
        return { success: false, error: `Groq network error: ${requestResult.networkError.message}` };
      }

      if (isModelFailure(requestResult.status, requestResult.errText)) {
        continue;
      }

      return { success: false, error: `Groq error ${requestResult.status}: ${requestResult.errText}` };
    }

    const text = await readResultByProvider(requestResult.response, 'groq');
    return {
      success: true,
      text: text || 'No content returned.',
      model,
    };
  }

  return {
    success: false,
    error: `Groq model not found. Attempted: ${attempted.join(', ')}`,
  };
}
