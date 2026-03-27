import { extApi, getLocalSettings } from './modules/runtime.js';
import { buildFinalPrompt, getOutputTokenLimit } from './modules/config.js';
import { getHostnameFromSender, isAllowedHost } from './modules/hosts.js';
import { fetchGemini, fetchOpenRouter, fetchGroq } from './modules/providers.js';

extApi.commands.onCommand.addListener(async (command) => {
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) {
      return;
    }

    await extApi.tabs.sendMessage(tabs[0].id, { command });
  } catch (error) {
    const lastError = extApi.runtime?.lastError?.message;
    if (lastError) {
      console.warn(`Command delivery skipped: ${lastError}`);
      return;
    }
    console.warn(`Command delivery failed: ${error?.message || 'Unknown error'}`);
  }
});

function getProviderOrder(selectedProvider) {
  return [selectedProvider, 'gemini', 'openrouter', 'groq'].filter(
    (value, index, arr) => arr.indexOf(value) === index
  );
}

async function callProvider(candidate, storage, request, finalPrompt, maxOutputTokens) {
  if (candidate === 'openrouter') {
    if (!storage.openRouterApiKey) {
      return { success: false, error: 'OpenRouter API key is not set.' };
    }

    return fetchOpenRouter({
      apiKey: storage.openRouterApiKey,
      prompt: finalPrompt,
      requestedModel: request.model || storage.openRouterModel,
      maxOutputTokens,
    });
  }

  if (candidate === 'groq') {
    if (!storage.groqApiKey) {
      return { success: false, error: 'Groq API key is not set.' };
    }

    return fetchGroq({
      apiKey: storage.groqApiKey,
      prompt: finalPrompt,
      requestedModel: request.model || storage.groqModel,
      maxOutputTokens,
    });
  }

  if (!storage.geminiApiKey) {
    return { success: false, error: 'Gemini API key is not set.' };
  }

  return fetchGemini({
    apiKey: storage.geminiApiKey,
    prompt: finalPrompt,
    requestedModel: request.model || storage.geminiModel,
    maxOutputTokens,
  });
}

extApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== 'FETCH_AI' && request.type !== 'FETCH_GEMINI') {
    return false;
  }

  (async () => {
    const storage = await getLocalSettings([
      'activeProvider',
      'answerMode',
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
    const answerMode = request.answerMode || storage.answerMode || 'direct';
    const finalPrompt = buildFinalPrompt(request.prompt || '', answerMode);
    const maxOutputTokens = getOutputTokenLimit(answerMode);

    if (!finalPrompt.trim()) {
      sendResponse({ success: false, error: 'Prompt is empty.' });
      return;
    }

    const providers = getProviderOrder(provider);
    const errors = [];

    for (const candidate of providers) {
      const result = await callProvider(candidate, storage, request, finalPrompt, maxOutputTokens);
      if (result.success) {
        sendResponse({ ...result, provider: candidate });
        return;
      }

      errors.push(`${candidate}: ${result.error}`);
    }

    sendResponse({ success: false, error: `All providers failed. ${errors.join(' | ')}` });
  })();

  return true;
});
