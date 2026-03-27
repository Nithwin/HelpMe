/*
 * FILENAME: App.js
 * ----------------
 * This is the main React component for the extension's UI.
 */
import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const extApi = globalThis.browser ?? globalThis.chrome;

const DEFAULT_ALLOWED_HOSTS = 'localhost, 127.0.0.1';

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    keyStorage: 'geminiApiKey',
    modelStorage: 'geminiModel',
    keyPlaceholder: 'AIza...',
    modelPlaceholder: 'gemini-2.5-flash',
  },
  openrouter: {
    label: 'OpenRouter',
    keyStorage: 'openRouterApiKey',
    modelStorage: 'openRouterModel',
    keyPlaceholder: 'sk-or-v1-...',
    modelPlaceholder: 'openai/gpt-4o-mini',
  },
  groq: {
    label: 'Groq',
    keyStorage: 'groqApiKey',
    modelStorage: 'groqModel',
    keyPlaceholder: 'gsk_...',
    modelPlaceholder: 'llama-3.3-70b-versatile',
  },
};

function parseAllowedHosts(value) {
  return value
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function App() {
  const [provider, setProvider] = useState('gemini');
  const [answerMode, setAnswerMode] = useState('direct');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('Welcome! Ask a practice question to get started.');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState('');
  const [allowedHostsInput, setAllowedHostsInput] = useState(DEFAULT_ALLOWED_HOSTS);

  useEffect(() => {
    const loadSettings = async () => {
      const result = await extApi.storage.local.get([
        'activeProvider',
        'answerMode',
        'geminiApiKey',
        'geminiModel',
        'openRouterApiKey',
        'openRouterModel',
        'groqApiKey',
        'groqModel',
        'allowedHosts',
      ]);

        setProvider(result.activeProvider || 'gemini');
        setAnswerMode(result.answerMode || 'direct');

        setGeminiApiKey(result.geminiApiKey || '');
        setGeminiModel(result.geminiModel || '');
        setOpenRouterApiKey(result.openRouterApiKey || '');
        setOpenRouterModel(result.openRouterModel || '');
        setGroqApiKey(result.groqApiKey || '');
        setGroqModel(result.groqModel || '');

        if (Array.isArray(result.allowedHosts) && result.allowedHosts.length > 0) {
          setAllowedHostsInput(result.allowedHosts.join(', '));
        }

        const hasAnyKey = !!(result.geminiApiKey || result.openRouterApiKey || result.groqApiKey);
        setShowSettings(!hasAnyKey);
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const handleReset = () => {
      setPrompt('');
      setResponse('Chat reset. Ready for the next prompt.');
    };

    window.addEventListener('reset-gemini-chat', handleReset);
    return () => window.removeEventListener('reset-gemini-chat', handleReset);
  }, []);

  const activeProviderConfig = useMemo(() => PROVIDERS[provider], [provider]);

  const activeModel = useMemo(() => {
    if (provider === 'openrouter') return openRouterModel;
    if (provider === 'groq') return groqModel;
    return geminiModel;
  }, [provider, geminiModel, openRouterModel, groqModel]);

  const providerHasKey = useMemo(() => {
    if (provider === 'openrouter') return Boolean(openRouterApiKey.trim());
    if (provider === 'groq') return Boolean(groqApiKey.trim());
    return Boolean(geminiApiKey.trim());
  }, [provider, geminiApiKey, openRouterApiKey, groqApiKey]);

  const handleSaveSettings = () => {
    const allowedHosts = parseAllowedHosts(allowedHostsInput || DEFAULT_ALLOWED_HOSTS);

    extApi.storage.local.set(
      {
        activeProvider: provider,
        answerMode,
        geminiApiKey: geminiApiKey.trim(),
        geminiModel: geminiModel.trim(),
        openRouterApiKey: openRouterApiKey.trim(),
        openRouterModel: openRouterModel.trim(),
        groqApiKey: groqApiKey.trim(),
        groqModel: groqModel.trim(),
        allowedHosts,
      }
    ).then(() => {
        if (!providerHasKey) {
          setResponse(`Saved, but ${activeProviderConfig.label} key is empty. Add it before sending.`);
          return;
        }
        setResponse('Settings saved.');
        setShowSettings(false);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    if (!providerHasKey) {
      setResponse(`Missing ${activeProviderConfig.label} API key. Open settings and add it.`);
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    setResponse('');

    extApi.runtime.sendMessage(
      {
        type: 'FETCH_AI',
        provider,
        answerMode,
        model: activeModel,
        prompt,
      },
    ).then((apiResponse) => {
      if (apiResponse?.success) {
        setResponse(apiResponse.text);
      } else {
        setResponse(`Error: ${apiResponse?.error || 'No response from service worker.'}`);
      }
      setIsLoading(false);
    }).catch((error) => {
      setResponse(`Error: ${error?.message || 'Failed to send request.'}`);
      setIsLoading(false);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  const handleResetPosition = () => {
    window.dispatchEvent(new CustomEvent('reset-gemini-position'));
  };

  return (
    <div className="app-container">
      <div className="chat-view">
        <div className="header" title="Drag to move">
          <h3>{`${activeProviderConfig.label}${activeModel ? ` • ${activeModel}` : ''}`}</h3>
          <div className="header-controls">
            <button onClick={handleResetPosition} className="icon-btn" title="Reset Position (Alt+Shift+R)">
              <img src={extApi.runtime.getURL('assets/reset-icon.svg')} alt="Reset Position" />
            </button>
            <button onClick={() => setShowSettings((prev) => !prev)} className="change-key-btn">
              {showSettings ? 'Close Settings' : 'Settings'}
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="settings-view">
            <h2>Provider Setup</h2>
            <p style={{ marginTop: '-10px', marginBottom: '14px' }}>
              Practice mode only: requests run only on allowed hostnames.
            </p>

            <label>Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
              <option value="groq">Groq</option>
            </select>

            <label>Answer Mode</label>
            <select value={answerMode} onChange={(e) => setAnswerMode(e.target.value)}>
              <option value="direct">Direct Answer</option>
              <option value="mcq">MCQ (answer only)</option>
              <option value="coding">Coding (formatted solution)</option>
            </select>

            <label>Gemini API Key</label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder={PROVIDERS.gemini.keyPlaceholder}
            />

            <label>Gemini Model (optional)</label>
            <input
              type="text"
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              placeholder={PROVIDERS.gemini.modelPlaceholder}
            />

            <label>OpenRouter API Key</label>
            <input
              type="password"
              value={openRouterApiKey}
              onChange={(e) => setOpenRouterApiKey(e.target.value)}
              placeholder={PROVIDERS.openrouter.keyPlaceholder}
            />

            <label>OpenRouter Model (optional)</label>
            <input
              type="text"
              value={openRouterModel}
              onChange={(e) => setOpenRouterModel(e.target.value)}
              placeholder={PROVIDERS.openrouter.modelPlaceholder}
            />

            <label>Groq API Key</label>
            <input
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder={PROVIDERS.groq.keyPlaceholder}
            />

            <label>Groq Model (optional)</label>
            <input
              type="text"
              value={groqModel}
              onChange={(e) => setGroqModel(e.target.value)}
              placeholder={PROVIDERS.groq.modelPlaceholder}
            />

            <label>Allowed Hosts (comma separated)</label>
            <input
              type="text"
              value={allowedHostsInput}
              onChange={(e) => setAllowedHostsInput(e.target.value)}
              placeholder={DEFAULT_ALLOWED_HOSTS}
            />

            <button type="button" onClick={handleSaveSettings}>
              Save Settings
            </button>
          </div>
        )}

        <div className="response-area">
          {isLoading ? <div className="loader">Loading...</div> : <p>{response}</p>}
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question... (Ctrl+Enter to send)"
            rows="4"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !prompt.trim()}>
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
