
# HelpMe — Gemini Assistant Extension

A small browser extension and demo built with React + Vite that injects an AI-powered assistant into web pages. The assistant uses your own Gemini API key to answer questions, clarify meanings, and provide inline explanations while you browse.

This README documents installation, usage, animation/UX notes, and contribution guidance.

## Checklist (what this README covers)
- Full project overview — Done
- How to install and run locally — Done
- How to set up and use your Gemini API key — Done
- How to use the extension in the browser — Done
- Animation and UI notes (where to edit) — Done
- Files of interest and quick dev tips — Done
- Contribution & troubleshooting notes — Done

## Quick features
- Live AI assistant overlay that responds to typed queries.
- Inline lookup: select text on a page to ask the assistant for a definition or clarification.
- Lightweight animated UI (CSS-based) for smooth appearance/disappearance.
- Uses your Gemini API key so you keep control of billing and data.

## Install (dev)
1. Clone the repo and open the project folder.
2. Install dependencies:

```powershell
npm install
```

3. Run the dev server and load the extension in your browser (see "Run & Load in Browser").

```powershell
npm run dev
```

Notes:
- This project uses Vite. If you have `npm run dev` configured, it will start a local dev server.

## Build
To produce a production build (bundle static assets):

```powershell
npm run build
```

The built files are placed in the `dist/` folder by default (Vite config). Use them to pack the extension or host the web UI.

## Gemini API setup
This project expects you to provide your own Gemini API key. We follow the common Vite pattern using environment variables.

1. Create a `.env` file in the repo root (not committed to Git):

```text
VITE_GEMINI_API_KEY=your_api_key_here
VITE_GEMINI_API_URL=https://api.example.com/v1/gemini
```

2. Restart the dev server after adding the `.env` file so Vite picks up the variables.

Security note: never commit your API key to source control. Use a secrets manager or CI environment variables for production.

Implementation note: the UI calls a small client in `src/` that reads `import.meta.env.VITE_GEMINI_API_KEY` and sends requests to the configured endpoint.

## How to use (in the browser)
1. Run the dev server (`npm run dev`) or build (`npm run build`).
2. Load the extension into your browser (Chrome/Edge/Brave):
	 - Open the Extensions page (chrome://extensions/) and enable Developer mode.
	 - Click "Load unpacked" and select the `public/` folder (or the `dist/` output for production).
3. Open any web page. Click the extension icon and toggle the assistant, or select text and use the context action (if configured).
4. Type a question in the assistant input. The assistant will send your query to the Gemini API and display a response inline.

Usage tips:
- Selecting text then opening the assistant will pre-fill the input with the selected text.
- The assistant is intentionally lightweight: short prompts and follow-ups work best.

## Animation & UI notes
The assistant UI uses simple CSS transitions so it feels smooth without heavy JS animation frameworks.

Where to edit animations:
- `src/App.css` — main layout and animation utilities for the popup/overlay.
- `src/content.css` — styles applied when the assistant is injected into a page. Look for classes named `.assistant`, `.assistant-enter`, and `.assistant-exit`.

Common patterns used:
- Fade + slide: opacity transition + transform translateY for entrance/exit.
- Scale + ease for small popovers (use transform: scale(0.98) -> scale(1)).

Quick example (already present in `src/content.css` — tweak these values):

```css
.assistant {
	transition: opacity 180ms ease, transform 200ms cubic-bezier(.2,.9,.2,1);
}
.assistant-enter { opacity: 0; transform: translateY(6px) scale(0.99); }
.assistant-enter-active { opacity: 1; transform: translateY(0) scale(1); }
.assistant-exit { opacity: 1; transform: translateY(0); }
.assistant-exit-active { opacity: 0; transform: translateY(6px); }
```

Edit timing and easing in `src/App.css` or `src/content.css` to customize the feel.

## Files of interest
- `src/content.jsx` — content script / injected UI logic.
- `src/content.css` — styles for the in-page assistant.
- `src/App.jsx` / `src/App.css` — main React app used for extension popup or demo UI.
- `src/main.jsx` — Vite entry point.
- `public/manifest.json` — extension manifest (permissions, content scripts, icons).
- `public/background.js` — background script for extension event handling (if present).

If you want to change the assistant's behavior, start in `src/content.jsx` where selected text is captured and requests are prepared.

## Development contract (inputs/outputs)
- Input: user query string, optional selected text, environment variable `VITE_GEMINI_API_KEY`.
- Output: assistant text response (rendered HTML in the overlay), optional tooltips or follow-up suggestions.
- Error modes: network/API errors, missing API key, rate limits — all surfaced in the UI as short messages.

Edge cases to handle in code:
- Empty queries — disable submit or show helpful hint.
- Large responses — truncate with "show more" to avoid layout breakage.
- Slow or failing API — show a retry button and a short timeout.

## Testing & quality gates
- Lint/types: run your project's linter and type checker (if added).
- Quick smoke test: run dev server and open a page to confirm the assistant appears and responds to a simple query.

## Contributing
Contributions are welcome. Suggestions:
- Improve animations or accessibility for keyboard users.
- Add unit tests for request helpers and UI components.
- Add an optional server-side proxy to keep the API key off the client (recommended for production).

Please open an issue or a pull request with a clear title and description.

## Troubleshooting
- No response from assistant: verify `VITE_GEMINI_API_KEY` and `VITE_GEMINI_API_URL` are set and valid.
- Extension not loading: ensure you selected the correct folder (`public/` for dev, `dist/` for production) when using "Load unpacked".
- Styles not applied: check that `content.css` is referenced in `manifest.json` as a content script or imported by the content entry.
- Ctrl+Space / Command+Space not working: Some OS configurations reserve these keys (IME switch, Spotlight). The extension now includes a direct in-page fallback listener; try the shortcut again after focusing the page. If still blocked, customize the command in `chrome://extensions/shortcuts` (suggest "Ctrl+Shift+Space" or "Alt+Space").

## License
Add your preferred license here (e.g., MIT). This README does not change licensing; ensure you include a `LICENSE` file if you plan to open-source.

---

If you'd like, I can also:
- Add a short animated GIF or SVG demo into `public/` and reference it in this README.
- Create a `.env.example` and a tiny helper that sends requests to Gemini using the Vite env variable.

Tell me which of the above you'd like next and I'll implement it.
