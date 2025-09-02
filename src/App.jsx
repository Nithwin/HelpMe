// App.js (inside your src folder)
import React, { useState, useEffect } from 'react';
// Make sure you have a basic App.css or similar for styling
// import './App.css'; 

function App() {
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // EFFECT 1: Check for the stored API key when the app first loads.
  useEffect(() => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        setApiKey(result.geminiApiKey);
        setIsKeySaved(true);
      }
    });
  }, []); // The empty array [] means this effect runs only once.

  // EFFECT 2: Listen for the 'reset' command from our content script.
  useEffect(() => {
    const handleReset = () => {
      console.log("Reset command received in App.js");
      setPrompt('');
      setResponse('');
    };

    // This is the new event listener for the Shadow DOM method
    window.addEventListener('reset-gemini-chat', handleReset);

    // This is a cleanup function that removes the listener when the component is unmounted
    return () => {
      window.removeEventListener('reset-gemini-chat', handleReset);
    };
  }, []); // This effect also runs only once.


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
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt) return;
    setIsLoading(true);
    setResponse('');

    // Send a message to the background script to fetch from the API
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

  if (!isKeySaved) {
    return (
      <div className="settings-view">
        <h2>Enter your Gemini API Key</h2>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your Gemini API Key"
        />
        <button onClick={handleKeySave}>Save Key</button>
      </div>
    );
  }

  return (
    <div className="chat-view">
      <div className="header">
        <h3>Gemini Assistant</h3>
        <button onClick={handleChangeKey} className="change-key-btn">Change Key</button>
      </div>
      <div className="response-area">
        {isLoading ? <p>Loading...</p> : <p>{response}</p>}
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Gemini anything..."
          rows="4"
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}

export default App;