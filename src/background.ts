import { extApi, getLocalSettings } from './modules/runtime';
import { buildFinalPrompt, getOutputTokenLimit } from './modules/config';
import { getHostnameFromSender, isAllowedHost } from './modules/hosts';
import { fetchGemini, fetchOpenRouter, fetchGroq, AIResponse } from './modules/providers';

extApi.commands.onCommand.addListener(async (command: string) => {
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) {
      return;
    }

    await extApi.tabs.sendMessage(tabs[0].id, { command });
  } catch (error: any) {
    const lastError = extApi.runtime?.lastError?.message;
    if (lastError) {
      console.warn(`Command delivery skipped: ${lastError}`);
      return;
    }
    console.warn(`Command delivery failed: ${error?.message || 'Unknown error'}`);
  }
});

async function callProvider(candidate: string, storage: any, prompt: string, model: string, maxOutputTokens: number): Promise<AIResponse> {
  const params = {
    apiKey: '',
    prompt,
    requestedModel: model,
    maxOutputTokens,
  };

  if (candidate === 'openrouter') {
    if (!storage.openRouterApiKey) return { success: false, text: '', error: 'OpenRouter API key is not set.' };
    params.apiKey = storage.openRouterApiKey;
    return fetchOpenRouter(params);
  }

  if (candidate === 'groq') {
    if (!storage.groqApiKey) return { success: false, text: '', error: 'Groq API key is not set.' };
    params.apiKey = storage.groqApiKey;
    return fetchGroq(params);
  }

  // Default to Gemini
  if (!storage.geminiApiKey) return { success: false, text: '', error: 'Gemini API key is not set.' };
  params.apiKey = storage.geminiApiKey;
  return fetchGemini(params);
}

extApi.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (request.type !== 'FETCH_AI') {
    return false;
  }

  (async () => {
    try {
      const storage = await getLocalSettings([
        'activeProvider',
        'allowedHosts',
        'geminiApiKey',
        'geminiModel',
        'openRouterApiKey',
        'openRouterModel',
        'groqApiKey',
        'groqModel',
      ]);

      const hostname = getHostnameFromSender(sender);
      if (!isAllowedHost(hostname, storage.allowedHosts)) {
        sendResponse({
          success: false,
          error: 'Blocked on this site. Add this hostname in Allowed Hosts for practice use.',
        });
        return;
      }

      const provider = request.provider || storage.activeProvider || 'gemini';
      const rawPrompt = request.prompt || '';
      const finalPrompt = buildFinalPrompt(rawPrompt, request.mode);
      const maxOutputTokens = getOutputTokenLimit(rawPrompt);

      if (!finalPrompt.trim()) {
        sendResponse({ success: false, error: 'Prompt is empty.' });
        return;
      }

      const result = await callProvider(
        provider, 
        storage, 
        finalPrompt, 
        request.model || storage[`${provider}Model`], 
        maxOutputTokens
      );

      sendResponse(result);
    } catch (error: any) {
      sendResponse({ success: false, error: error.message || 'Internal background error' });
    }
  })();

  return true;
});
