# ExamPilot Assistant ✈️🧠

ExamPilot is the ultimate stealth AI-powered browser extension designed to effortlessly solve MCQs and coding challenges on restricted platforms. It utilizes native UI simulation and autonomous looping to provide a seamless hands-free experience.

## ✨ Features
- **Autopilot Loop (`Alt+Z`)**: Enable a fully autonomous loop that scans the page, solves the MCQ, selects the option, and clicks the Next button repeatedly until you manually stop it.
- **Stealth Auto-Paste (`Alt+C` then `Alt+V`)**: Instantly injects AI-generated code directly into complex virtualized editors (like Monaco, Ace, CodeMirror) preventing proctoring protections natively from detecting standard clipboard operations.
- **Selection Unblocker**: Fully overrides site restrictions, allowing you to highlight, select, right-click, and copy text freely, no matter the portal.
- **Persistent Multi-API Backend**: Easily switch between Gemini, OpenRouter, and Groq right from the interface. API Keys are safely synced to your browser account allowing them to persist gracefully if the extension is uninstalled.

## 🚀 Shortcuts Reference
- `Ctrl + Space` (Mac: `Cmd + Space`): Open the manual assistant popup.
- `Alt + Z`: Toggle **Autopilot** mode On/Off.
- `Alt + C`: Store the answer for a Coding Question.
- `Alt + V`: Inject the **Stored Code** stealthily into the active editor.
- `Alt + Q`: Ask AI to select an MCQ answer silently.
- `Alt + A`: Ask the AI manually about selected text.

## 📦 Installation
1. Run `npm install` followed by `npm run build`.
2. Open your chromium-based browser and navigate to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `/dist` directory within this project.
5. In the loaded extension menu, enter your preferred API key and begin passing exams automatically!
