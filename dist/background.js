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

// 2. Listen for messages from the UI (React app)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_GEMINI') {
    chrome.storage.local.get(['geminiApiKey'], async (result) => {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        sendResponse({ success: false, error: "API key is not set." });
        return;
      }
      // Allow the UI to provide a preferred model name, otherwise try stored value or defaults
      chrome.storage.local.get(['geminiModel'], async (mRes) => {
        const requestedModel = request.model || mRes.geminiModel || 'gemini-1.5-flash-latest';

        // A small list of fallbacks in case the chosen model is not available
        const fallbackModels = [requestedModel, 'gemini-1.5', 'gemini-1.0', 'text-bison-001'];

        async function tryModel(modelName) {
          // Keep using the existing API shape but swap the model path string when constructing the URL
          const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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

            // If model not found or other error, return a structured error
            if (!response.ok) {
              let body = {};
              try { body = await response.json(); } catch (e) { body = { message: 'No JSON response' }; }
              const errMsg = `HTTP ${response.status} - ${JSON.stringify(body)}`;
              // If the error mentions model or 404, return a special code so we can try fallback
              const isModelError = response.status === 404 || /model not found|Model not found|MODEL_NOT_FOUND/i.test(JSON.stringify(body));
              return { ok: false, isModelError, message: errMsg };
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No content found in response.";
            return { ok: true, text };

          } catch (error) {
            return { ok: false, isModelError: /model not found|MODEL_NOT_FOUND/i.test(String(error)), message: error.message };
          }
        }

        // Try the requested model first, then fallbacks
        for (const m of fallbackModels) {
          if (!m) continue;
          const resultTry = await tryModel(m);
          if (resultTry.ok) {
            sendResponse({ success: true, text: resultTry.text, model: m });
            return;
          }
          // If model error, try next fallback; otherwise break and report the error
          if (!resultTry.isModelError) {
            sendResponse({ success: false, error: resultTry.message });
            return;
          }
          // otherwise continue to next fallback model
        }

        // If all fallbacks failed with model-not-found, send a helpful message
        sendResponse({ success: false, error: 'Model not found for requested options. Try selecting a different model in the extension settings.' });
      });
    });

    return true; // Indicates an asynchronous response
  }
});