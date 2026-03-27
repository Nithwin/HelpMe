# HelpMe Assistant v2.0.0

A premium, smart AI-powered assistant designed for exam portals. It provides instant, concise answers for MCQs, well-formatted solutions for coding problems, and structured essays.

## 🚀 Features

- **Smart Multi-Provider Support**: Switch seamlessly between **Gemini**, **OpenRouter**, and **Groq**.
- **Context-Aware Prompting**: Automatically detects question types (MCQ, Coding, Essay) to provide the most relevant format without extra filler.
- **Premium UI**: Modern glassmorphism design with a draggable interface and quick-access shortcuts.
- **Privacy First**: Practice mode settings to control which hostnames the assistant can run on.
- **Token Efficient**: Optimized system prompts to minimize API costs and improve speed.

## 🛠️ Installation

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in your browser:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** (top right).
   - Click **Load unpacked** and select the `dist` folder.

## ⚙️ Configuration

1. Click the extension icon or use `Ctrl+Space` to open the panel.
2. Click the **Settings (⚙️)** icon.
3. Choose your preferred **AI Provider**.
4. Enter your **API Key** (stored securely in local storage).
5. (Optional) Add specific **Allowed Hostnames** for practice use.

## ⌨️ Shortcuts

- `Ctrl + Space`: Toggle Assistant panel and focus input.
- `Alt + R`: Reset chat input.
- `Alt + Shift + R`: Reset panel position.
- `Ctrl + Enter`: Send current prompt.

## 📝 Usage

- **MCQs**: Just copy and paste the question with options. The AI will return ONLY the correct option.
- **Coding**: Paste the problem statement. The AI will return the code in a clean markdown block.
- **Essays**: Paste the prompt. The AI will provide a concise, structured response.

---
Developed with absolute focus on efficiency and user experience.
