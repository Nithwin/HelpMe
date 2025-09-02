/*
 * FILENAME: background.js
 * --------------------------
 * This is the service worker for the extension. It's the "brain".
 */

// 1. Listen for keyboard shortcut commands
chrome.commands.onCommand.addListener((command) => {
  console.log(`Command received: ${command}`);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      const activeTabId = tabs[0].id;
      
      chrome.tabs.sendMessage(activeTabId, { command: command }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            `Could not send command "${command}". This is expected on protected pages. Error:`,
            chrome.runtime.lastError.message
          );
        } else {
          console.log("Received response from content script:", response);
        }
      });
    } else {
      console.warn("No active tab found to send command to.");
    }
  });
});

// 2. Listen for messages from the UI (e.g., the React app)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_GEMINI') {
    chrome.storage.local.get(['geminiApiKey'], async (result) => {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        sendResponse({ success: false, error: "API key is not set." });
        return;
      }

      // --- FINAL FIX ---
      // Using the 'gemini-1.5-flash' model, which your API key has confirmed access to.
      const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      // --- END OF FIX ---
      
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: request.prompt }] }],
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          const errorMessage = `HTTP error! Status: ${response.status}, Body: ${JSON.stringify(errorBody)}`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No content found in response.";
        sendResponse({ success: true, text: text });

      } catch (error) {
        console.error("Error fetching from Gemini API:", error);
        sendResponse({ success: false, error: error.message });
      }
    });

    return true; 
  }
});