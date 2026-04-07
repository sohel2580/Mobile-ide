<div align="center">
  <img src="public/next.svg" alt="Taskkora Logo" width="200" height="auto" />
  <h1>🚀 Kora AI - Premium Code Editor</h1>
  
  <p>
    <b>The Next-Generation, Open-Source Browser-Based AI Code Editor</b><br/>
    <i>A proud product of the Taskkora ecosystem.</i>
  </p>

  <p>
    🌐 <b>Live Preview:</b> <a href="https://koragpt.vercel.app/" target="_blank">https://koragpt.vercel.app/</a>
  </p>

  <!-- Badges -->
  <p>
    <a href="https://github.com/alornishan014/KoraGPT_IDE/blob/master/LICENSE">
      <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License" />
    </a>
    <a href="https://github.com/alornishan014/KoraGPT_IDE/stargazers">
      <img src="https://img.shields.io/github/stars/alornishan014/KoraGPT_IDE?style=flat-square&color=yellow" alt="Stars" />
    </a>
    <a href="https://github.com/alornishan014/KoraGPT_IDE/network/members">
      <img src="https://img.shields.io/github/forks/alornishan014/KoraGPT_IDE?style=flat-square&color=lightgray" alt="Forks" />
    </a>
    <a href="https://github.com/alornishan014/KoraGPT_IDE/pulls">
      <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" />
    </a>
    <a href="https://github.com/alornishan014/KoraGPT_IDE/deployments">
      <img src="https://img.shields.io/badge/Deployments-10-success?style=flat-square" alt="Deployments" />
    </a>
    <img src="https://img.shields.io/badge/Next.js-16.2-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript" />
  </p>
</div>

<br />

## 🌟 What is Kora AI?

**Kora AI** is an advanced, AI-powered code editor that runs directly in your browser. Inspired by industry-leading editors like Cursor and Trae, Kora AI provides a premium, seamless development experience with deep AI integration. It understands your codebase, suggests complex edits, and applies them via an interactive, multi-tabbed Monaco Editor.

### 🛠️ How Kora AI Works (Architecture)
Kora AI is built using modern web technologies to provide a native-like IDE experience in the browser:
- **ChatSection**: The core AI interface where you can communicate with the AI. The AI understands your project context.
- **EditorSection**: Powered by Monaco Editor (the core of VS Code), offering robust code editing, syntax highlighting, and completion.
- **DiffView**: When the AI suggests changes, you can view them side-by-side with your original code, making it easy to accept or reject modifications.
- **ProjectTree**: A comprehensive file explorer that allows you to navigate through your project structure intuitively.
- **Sidebar & UI**: Built with Next.js and styled with modern CSS to ensure a sleek and responsive developer experience.

### ✨ Current Key Features

- **🤖 Deep AI Integration**: Chat directly with your codebase. The AI can read multiple files, understand context, and suggest precise code modifications.
- **� Local LLM Support (Ollama)**: Integrated support for offline, local AI models via Ollama for privacy and cost savings.
- **�📝 Monaco Editor Inside**: Powered by the same editor that runs VS Code, featuring syntax highlighting, code completion, minimap, and robust formatting.
- **🔄 Interactive Diff View**: See AI suggestions side-by-side with your original code. Accept (`Keep`) or Reject (`Undo`) changes with a single click.
- **📑 Multi-Tab Support**: Open, edit, and navigate through multiple files simultaneously with a sleek Tab Bar and Breadcrumbs.
- **🎙️ Voice-to-Code**: Speak your commands natively in Bengali or English, and let Kora AI write the code for you.
- **🎨 Image Generation**: Built-in support for generating images via Stable Diffusion.
- **💬 Real-Time Community Chat**: Sleek, non-intrusive glowing toast notifications for incoming community messages.
- **📊 Live Statistics**: Real-time active users and total viewers tracking powered by MongoDB.
- **📰 News Ticker**: Stay updated with the latest repository commits directly from the editor UI.

### 🆕 Latest IDE Explorer Upgrade (VS Code Style)

- **🌲 Recursive File System**: Upgraded explorer data model to support deeply nested folders and files with parent-child relationships.
- **📂 Smart Folder Actions**: Right-click and three-dot menu now supports Create File, Create Folder, Import File, Import Folder, Rename, Copy, Move, Paste, Download, and Delete.
- **📌 Folder-Aware Shortcuts**: Top explorer shortcut actions now work on the currently selected folder, so users can create or import directly inside the target folder.
- **🗂️ Multi-Tab Editing**: Improved tab state handling for opening, switching, and managing multiple files.
- **💾 Auto-Save Protection**: Entire workspace tree is persisted to localStorage with debounce to reduce data-loss risk.
- **🧩 Contextual File Icons**: Added extension-based icons for Python, JavaScript, HTML, CSS, JSON, TypeScript, and generic files.
- **📦 Download Options**: Supports single file download, folder zip download, and full project export as ZIP.
- **🚫 Export Exclusions**: Full project ZIP export ignores `node_modules` and `.git` folders to keep package size clean.
- **🖱️ Drag-and-Drop Move**: Basic drag-and-drop support for moving files/folders into folders.
- **📐 Sidebar Layout Optimization**: Explorer area expanded for more file space, and Recent section moved lower for better usability.
- **🔗 Share to AI with Real Context**: Share action now auto-attaches the selected file as an AI reference instead of only writing plain text in chat input.
- **@ Mention File/Folder Picker**: Type `@` in chat to search and select files/folders with keyboard support (arrow keys, enter, escape).
- **✅ Context Menu Action Feedback**: Context menu now auto-closes after action and shows quick feedback for Copy/Cut/Paste/Share/Delete operations.
- **⚡ Emmet + Snippets in Monaco**: Added Emmet support for HTML/CSS and custom snippet providers for JavaScript, TypeScript, React, and Python.
- **📸 Code Snapshot Export**: Added VS Code-style code snapshot action to capture selected code as a polished PNG image with syntax highlighting.
- **🛡️ Snapshot Runtime Stability Fix**: Replaced unsupported `lab`-based capture styles with html2canvas-safe gradient and color values.

---

## 🎯 Future Improvements (Areas for Contribution)

To make Kora AI the absolute best open-source AI editor, we are looking for contributors to help us build the following advanced features:

1. **💻 Integrated Terminal Emulation**: Allow users to run shell commands, install npm packages, and start dev servers directly inside Kora AI.
2. **🐙 GitHub / GitLab Integration**: Directly authenticate, pull repositories, commit, and push changes from within the IDE.
3. **🌐 Real-Time Collaboration**: Multiplayer editing capabilities similar to Google Docs or VS Code Live Share.
4. **🛠️ Advanced LSP (Language Server Protocol) Support**: Better intellisense, error checking, and code navigation for Python, Rust, Go, and more.
5. **🎨 Advanced Theming Engine**: Allow users to create, import, and share custom editor themes.
6. **📂 Cloud Storage Sync**: Save workspaces to the cloud and access them from any device.

---

## 🤝 Why Contribute to Kora AI?

We believe the future of coding is collaborative and AI-driven. While Kora AI is built as a premium product, we are opening the doors to the community to make it the **absolute best open-source AI editor in the world**.

By contributing, you get to:
1. **Shape the Future**: Influence how developers write code in the browser.
2. **Work with Cutting-Edge Tech**: Gain hands-on experience with Next.js 16, Monaco Editor, Hugging Face Inference, and complex state management.
3. **Build Your Portfolio**: Be recognized as a core contributor to a premium open-source project.

Whether you're fixing a bug, adding a new feature, or improving documentation, **your code matters!**

👉 Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) to get started!

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn or pnpm
- Hugging Face API Token (for AI features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/alornishan014/KoraGPT_IDE.git
   cd KoraGPT_IDE
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### 🔑 API Settings Setup
To use the AI features, you need to configure your Hugging Face Token in the settings.
<div align="center">
  <img src="public/Instraction.jpg" width="600" alt="API Settings Instruction" />
</div>

---

## 🖼️ Adding Images to README (Example)
*Want to make your project's README visually appealing? You can easily add images!*

**Markdown Syntax:**
```markdown
![Alt text describing the image](https://link-to-your-image.com/image.png)
```
**HTML Syntax (For better control over size/alignment):**
```html
<div align="center">
  <img src="https://link-to-your-image.com/image.png" width="600" alt="App Screenshot" />
</div>
```
*(Tip: You can drag and drop images directly into the GitHub editor, or host them in your repository's `public/` folder and link to them like `![logo](./public/logo.png)`.)*

---

## 🛡️ License & Copyright

**Copyright © 2026 Taskkora. All rights reserved.**

This project is open-source under the AGPL-3.0 License.
- ✅ **You CAN** use, modify, and distribute this software for personal or commercial purposes.
- ❌ **You CANNOT** use the "Kora AI" or "Taskkora" name, branding, or logo for any derivative works without explicit written permission.
- ❌ **You CANNOT** remove the copyright headers from the source files. The branding and identity of "Taskkora" must be respected.
- 🔄 **You MUST** open-source any modifications or derivative works under the same AGPL-3.0 License.

---

<div align="center">
  <b>Built with ❤️ by the Taskkora Team & Contributors</b><br>
  <i>Part of the Taskkora Ecosystem</i>
</div>
