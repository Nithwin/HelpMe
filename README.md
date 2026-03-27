# HelpMe - Practice Assistant Extension

A browser extension built with React + Vite that injects an AI assistant into webpages for practice workflows.

## What is included
- Multi-provider support: `Gemini`, `OpenRouter`, `Groq`
- Per-provider API key + optional model setting
- Low-token request pipeline:
  - Compact mode-specific prompt templates
  - Prompt whitespace compaction and input length limits
  - Output token caps per mode (`direct`, `mcq`, `coding`)
  - Deterministic generation params (`temperature: 0`, bounded `top_p`)
- Answer modes:
  - `Direct`: short final answer
  - `MCQ`: one-line final option only
  - `Coding`: formatted full solution in code blocks
- Allowed-host safety guard:
  - Requests are blocked unless the current page hostname is in your allowed list
  - Default allowed hosts: `localhost`, `127.0.0.1`

## Install
```bash
npm install
```

## Build
```bash
npm run build
```

## Load extension
1. Open `chrome://extensions/` (or Edge/Brave equivalent).
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `dist/` directory.

Note: `public/` stores source assets and manifest template. Use `dist/` after running `npm run build`.

## Firefox support
1. Build once: `npm run build`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click `Load Temporary Add-on...`.
4. Select `/dist/manifest.json`.

Note: for store publishing, package the extension from `dist/` and use the `browser_specific_settings.gecko` id in manifest.

## First-time setup
1. Open assistant UI with shortcut (`Ctrl+Space`) or extension command.
2. Open `Settings`.
3. Choose provider.
4. Add API key for that provider.
5. Optionally set model name.
6. Set `Allowed Hosts` (comma-separated), for example: `localhost, 127.0.0.1`.
7. Choose answer mode and click `Save Settings`.

## Provider notes
- Gemini endpoint: `generativelanguage.googleapis.com`
- OpenRouter endpoint: `openrouter.ai/api/v1/chat/completions`
- Groq endpoint: `api.groq.com/openai/v1/chat/completions`

Host permissions are configured in `public/manifest.json`.

## Main files
- `src/App.jsx`: UI, settings state, request dispatch
- `public/background.js`: provider routing, model fallback, prompt format policy, host guard
- `src/content.jsx`: injected UI host and keyboard command handling
- `public/manifest.json`: extension permissions, content script and command wiring

## Architecture decision guide
- Recommended now: keep this as a browser extension and migrate gradually to TypeScript.
- Do not use C++ for this extension architecture; complexity is high and browser integration is poor.
- Use Rust only if you are building a separate native app/service (not for the extension itself).

### Option A: Extension (best immediate path)
- Best for: in-browser workflows, quick updates, Chrome + Firefox portability.
- Stack: React + TypeScript + extension APIs.
- Pros: fastest iteration, easiest distribution, lowest maintenance overhead.
- Cons: browser sandbox limits filesystem and native system access.

### Option B: Extension + backend service (best scale path)
- Best for: advanced orchestration, analytics, queueing, account features, stronger reliability.
- Stack: current extension + Node/Rust backend API.
- Pros: secure key handling, better observability, centralized policy control.
- Cons: infra cost and backend ops required.

### Option C: Desktop application (only when browser limits block you)
- Best for: deep OS integration, multi-window workflows, offline datasets, heavy automation.
- Stack options:
  - `Tauri` (Rust + web UI): lightweight and performant.
  - `Electron` (Node + web UI): faster dev, heavier runtime.
- Pros: full system control and richer UX possibilities.
- Cons: packaging/signing/update complexity and larger product scope.

### Rust vs C++ vs JavaScript/TypeScript summary
- JavaScript/TypeScript: best fit for extension logic and UI.
- Rust: good for backend services or Tauri app core where performance/safety matter.
- C++: usually not worth it here unless you have a very specific native-performance module.

### Suggested roadmap
1. Keep extension-first architecture.
2. Migrate to TypeScript gradually (`allowJs`, `checkJs`).
3. Add backend only when you need shared accounts, logs, or advanced policy.
4. Move to desktop app only if browser APIs become the blocker.

## TypeScript guidance
- You do not need a full TypeScript migration right now to run cross-browser.
- Recommended path:
  1. Add `tsconfig.json` with `allowJs: true` and `checkJs: true` for gradual typing.
  2. Convert `src/App.jsx` and `src/content.jsx` first.
  3. Convert `public/background.js` last after provider types are stable.
- This gives type safety without blocking delivery.

## Quality checks
```bash
npm run lint
npm run build
```

## Troubleshooting
- `Blocked on this site`: add current hostname to `Allowed Hosts` in settings.
- `API key is not set`: add key for the selected provider.
- `Model not found`: set a valid model name or leave model empty to use fallback defaults.
- Shortcut conflict (`Ctrl+Space`): change shortcut in `chrome://extensions/shortcuts`.
