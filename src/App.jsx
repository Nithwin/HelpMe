// App.js
import React, { useState, useEffect } from 'react';
import './App.css'; // Import the new modern styles

function App() {
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('Welcome! Ask me anything to get started.');
  const [isLoading, setIsLoading] = useState(false);

  // EFFECT 1: Check for stored API key on initial load
  useEffect(() => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        setApiKey(result.geminiApiKey);
        setIsKeySaved(true);
      }
    });
  }, []);

  // EFFECT 2: Listen for the 'reset' command from the content script
  useEffect(() => {
    const handleReset = () => {
      console.log("Reset command received in App.js");
      setPrompt('');
      setResponse('Chat has been reset. Ask me something new!');
    };

    window.addEventListener('reset-gemini-chat', handleReset);
    return () => {
      window.removeEventListener('reset-gemini-chat', handleReset);
    };
  }, []);

  const handleKeySave = () => {
    if (!apiKey) {
      alert('Please enter an API key.');
      return;
    }
    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      setIsKeySaved(true);
      console.log('API Key saved.');
    });
  };

  const handleChangeKey = () => {
    setIsKeySaved(false);
  };

  // Allow submitting with Ctrl+Enter or Cmd+Enter
  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) && !isLoading) {
      handleSubmit(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResponse('');

    chrome.runtime.sendMessage(
      { type: 'FETCH_GEMINI', prompt: prompt },
      (apiResponse) => {
        if (apiResponse && apiResponse.success) {
          setResponse(apiResponse.text);
        } else {
          setResponse(`Error: ${apiResponse ? apiResponse.error : 'No response from background.'}`);
        }
        setIsLoading(false);
      }
    );
  };

  // Conditional Rendering for API Key Input
  if (!isKeySaved) {
    return (
      <div className="app-container">
        <div className="settings-view">
          <h2>Enter Gemini API Key</h2>
          <p style={{ color: 'var(--text-secondary-color)', marginTop: '-10px', marginBottom: '20px' }}>
            Your key is stored locally and never shared.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your Gemini API Key"
            onKeyDown={(e) => e.key === 'Enter' && handleKeySave()}
          />
          <button onClick={handleKeySave}>Save Key</button>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="app-container">
      <div className="chat-view">
        <div className="header">
          <h3>Gemini Assistant</h3>
          <button onClick={handleChangeKey} className="change-key-btn">Change Key</button>
        </div>
        <div className="response-area">
          {isLoading ? (
            <div className="loader">Loading...</div>
          ) : (
            <p>{response}</p>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Ctrl+Enter to send)"
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