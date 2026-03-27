import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const extApi = (globalThis as any).browser ?? (globalThis as any).chrome;

const DEFAULT_ALLOWED_HOSTS = 'localhost, 127.0.0.1';

interface ProviderConfig {
  label: string;
  keyStorage: string;
  keyPlaceholder: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  gemini: {
    label: 'Gemini',
    keyStorage: 'geminiApiKey',
    keyPlaceholder: 'AIza...',
  },
  openrouter: {
    label: 'OpenRouter',
    keyStorage: 'openRouterApiKey',
    keyPlaceholder: 'sk-or-v1-...',
  },
  groq: {
    label: 'Groq',
    keyStorage: 'groqApiKey',
    keyPlaceholder: 'gsk_...',
  },
};

function parseAllowedHosts(value: string) {
  return value
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function App() {
  const [provider, setProvider] = useState('gemini');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('Welcome! Paste your question to get the answer.');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [autoDelay, setAutoDelay] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const result = await extApi.storage.local.get([
        'activeProvider',
        'geminiApiKey',
        'openRouterApiKey',
        'groqApiKey',
      ]);

      setProvider(result.activeProvider || 'gemini');
      setGeminiApiKey(result.geminiApiKey || '');
      setOpenRouterApiKey(result.openRouterApiKey || '');
      setGroqApiKey(result.groqApiKey || '');
      if (result.autoDelay !== undefined) setAutoDelay(result.autoDelay);

      const hasAnyKey = !!(result.geminiApiKey || result.openRouterApiKey || result.groqApiKey);
      if (!hasAnyKey) setShowSettings(true);
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const handleAskSelection = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string; autoSelect: boolean }>;
      const { text, autoSelect } = customEvent.detail;
      if (text) {
        setPrompt(text);
        submitPrompt(text, autoSelect);
      }
    };

    window.addEventListener('gemini-ask-selection', handleAskSelection as EventListener);
    return () => {
      window.removeEventListener('gemini-ask-selection', handleAskSelection as EventListener);
    };
  }, [provider]); // We need provider to be fresh


  const activeProviderConfig = useMemo(() => PROVIDERS[provider], [provider]);

  const providerHasKey = useMemo(() => {
    if (provider === 'openrouter') return Boolean(openRouterApiKey.trim());
    if (provider === 'groq') return Boolean(groqApiKey.trim());
    return Boolean(geminiApiKey.trim());
  }, [provider, geminiApiKey, openRouterApiKey, groqApiKey]);

  const handleSaveSettings = () => {
    extApi.storage.local.set({
      activeProvider: provider,
      geminiApiKey: geminiApiKey.trim(),
      openRouterApiKey: openRouterApiKey.trim(),
      groqApiKey: groqApiKey.trim(),
      autoDelay: autoDelay,
    }).then(() => {
      setResponse('Settings saved.');
      setShowSettings(false);
    });
  };

  const submitPrompt = (textToSubmit: string, autoSelect = false) => {
    if (!textToSubmit.trim() || isLoading) return;

    setIsLoading(true);
    setResponse('');

    extApi.runtime.sendMessage({
      type: 'FETCH_AI',
      provider,
      prompt: textToSubmit,
    }).then((apiResponse: any) => {
      if (apiResponse?.success) {
        setResponse(apiResponse.text);
        if (autoSelect) {
          window.dispatchEvent(new CustomEvent('gemini-select-answer', { detail: apiResponse.text }));
        }
      } else {
        setResponse(`Error: ${apiResponse?.error || 'No response from service worker.'}`);
      }
      setIsLoading(false);
    }).catch((error: any) => {
      setResponse(`Error: ${error?.message || 'Failed to send request.'}`);
      setIsLoading(false);
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    submitPrompt(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    const oldText = response;
    setResponse('Copied to clipboard!');
    setTimeout(() => setResponse(oldText), 1500);
  };

  return (
    <div className="app-container">
      <div className="glass-panel">
        <header className="app-header">
          <div className="title-section">
            <h1>HelpMe</h1>
          </div>
          <button 
            className={`settings-toggle ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Toggle Settings"
          >
            ⚙️
          </button>
        </header>

        <main className="app-content">
          {showSettings ? (
            <section className="settings-section">
              <h2>Provider Settings</h2>
              
              <div className="input-group">
                <label>Active Provider</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {Object.entries(PROVIDERS).map(([id, cfg]) => (
                    <option key={id} value={id}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              <div className="scroll-area">
                <div className="provider-keys">
                  {Object.entries(PROVIDERS).map(([id, cfg]) => (
                    <div key={id} className="key-entry">
                      <label>{cfg.label} API Key</label>
                      <input
                        type="password"
                        placeholder={cfg.keyPlaceholder}
                        value={id === 'gemini' ? geminiApiKey : id === 'openrouter' ? openRouterApiKey : groqApiKey}
                        onChange={(e) => {
                          if (id === 'gemini') setGeminiApiKey(e.target.value);
                          else if (id === 'openrouter') setOpenRouterApiKey(e.target.value);
                          else setGroqApiKey(e.target.value);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="input-group checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={autoDelay} 
                    onChange={(e) => setAutoDelay(e.target.checked)} 
                  />
                  Human-like Delay (1-3s) for Auto-Select
                </label>
              </div>

              <button className="save-btn" onClick={handleSaveSettings}>Save & Close</button>
            </section>
          ) : (
            <section className="chat-section">
              <div className="response-container">
                <div className="response-header">
                  <span>AI Response</span>
                  {response && response.length > 0 && !isLoading && (
                    <button onClick={handleCopy} className="copy-btn">Copy</button>
                  )}
                </div>
                <div className="response-text">
                  {isLoading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    <pre>{response}</pre>
                  )}
                </div>
              </div>

              <form className="prompt-form" onSubmit={handleSubmit}>
                <textarea
                  placeholder="Paste your question here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button type="submit" disabled={isLoading || !prompt.trim()}>
                  {isLoading ? 'Thinking...' : 'Get Answer'}
                </button>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
