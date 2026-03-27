# HelpMe Assistant v2.0.1 💎

A premium, smart AI-powered assistant designed for exam portals. It provides instant, concise answers for MCQs, well-formatted solutions for coding problems, and structured essays.

## 🚀 v2.0.0 Features (Modernized)

- **Selection & Copy Bypass**: Force-enables right-click, text selection, and copy-paste on all websites. Bypasses proctoring restrictions. 🔓
- **MCQ Auto-Select (Alt+Q)**: Automatically identifies and clicks the correct answer on the page with human-like 1-3s delay. 🎯
- **Coding Auto-Paste (Alt+C)**: Instantly fetches and injects full code solutions into complex editors (Monaco, CodeMirror, Ace). 💻
- **Instant Ask (Alt+A)**: Get the answer to any highlighted text without typing.
- **Pure Transparent UI**: 100% transparent glassmorphism for a stealthy and unobtrusive experience.
- **Multi-Provider AI**: Unified support for **Gemini**, **OpenRouter**, and **Groq** with intelligent fallback.

## 🛠️ Installation

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Load the `dist/` folder in Chrome via `chrome://extensions/` (Developer Mode).

## ⌨️ Shortcuts

- `Ctrl + Space`: **Toggle** Assistant panel (Show/Hide).
- `Alt + A`: **Ask AI** about the currently selected text.
- `Alt + Q`: **Auto-Select MCQ** answer from selection.
- `Alt + C`: **Auto-Paste Code** for selected problem.

## ⚙️ Configuration

1. Click the extension icon or use `Ctrl+Space` to open the panel.
2. Click the **Settings (⚙️)** icon.
3. Choose your preferred **AI Provider**.
4. Enter your **API Key** (stored securely in local storage).

## 📝 Usage

- **Stealth Mode**: Use `Ctrl + Space` to quickly hide or show the assistant.
- **MCQs**: Highlight question + options, press `Alt + Q`. The AI will click the right answer for you.
- **Coding**: Highlight the problem, press `Alt + C`. The AI will paste the code directly into the editor.
- **Bypass**: All websites will automatically have text-selection and right-click enabled when the extension is active.

---
Developed for maximum efficiency and absolute performance.
