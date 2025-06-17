# A-B/AI – Your Multi-Model Desktop Copilot

[![Version](https://img.shields.io/github/v/release/skylordafk/A-B-AI?include_prereleases&label=Version)](https://github.com/skylordafk/A-B-AI/releases)
[![Downloads](https://img.shields.io/github/downloads/skylordafk/A-B-AI/total?label=Downloads)](https://github.com/skylordafk/A-B-AI/releases)
[![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white)](https://skylordafk.github.io/A-B-AI/download.html)
[![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)](https://skylordafk.github.io/A-B-AI/download.html)
[![GitHub issues](https://img.shields.io/github/issues/skylordafk/A-B-AI?label=Issues)](https://github.com/skylordafk/A-B-AI/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/skylordafk/A-B-AI)](https://github.com/skylordafk/A-B-AI/commits/master)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Download](https://img.shields.io/badge/Download-App-brightgreen?logo=github)](https://skylordafk.github.io/A-B-AI/download.html)

> **A-B/AI** lets you chat with multiple AI models side-by-side, crunch thousands of prompts in bulk, and compare costs – all in a slick cross-platform desktop app.

---

## ✨ Highlights

**Core Features:**

- **Multi-Model Chat** – Compare OpenAI, Anthropic, Gemini, Grok responses side-by-side with real-time cost tracking
- **Batch Processing** – Import CSV/JSON, run thousands of prompts in parallel, export results with automatic retries
- **Cost Analytics** – Built-in pricing database for 30+ models with pre-send cost estimation
- **Diff Viewer** – Spot model output differences and regressions instantly
- **Plugin SDK** – Extend functionality with custom providers ([`packages/abai-plugin-sdk`](packages/abai-plugin-sdk))
- **Cross-Platform** – Native Windows & macOS apps with dark/light themes

---

## 📥 Download

Grab the latest signed installers from the **Download** badge above or head to our GitHub Pages mirror:

👉 **https://skylordafk.github.io/A-B-AI/download.html**

The page always points to the most recent stable release on the [Releases](https://github.com/skylordafk/A-B-AI/releases) tab.

---

## 🚀 Quick Start

1. **Download & Install** – Get the latest version from the download page above
2. **Add API Keys** – Open Settings (File → Settings) and add your provider API keys:
   - OpenAI: Get from [platform.openai.com](https://platform.openai.com/api-keys)
   - Anthropic: Get from [console.anthropic.com](https://console.anthropic.com/)
   - Google: Get from [aistudio.google.com](https://aistudio.google.com/app/apikey)
   - Grok: Get from [console.x.ai](https://console.x.ai/)
3. **Start Chatting** – Select models, type your prompt, hit Send to compare responses
4. **Try Batch Mode** – Click the dropdown next to Send → "Open Batch Prompting" to process multiple prompts

---

## 🔧 Build From Source (Dev Mode)

```bash
# 1. Clone
 git clone https://github.com/skylordafk/A-B-AI.git && cd A-B-AI

# 2. Install deps (monorepo managed by pnpm)
 pnpm install --frozen-lockfile

# 3. Run the app with hot reload
 pnpm dev
```

The Electron window will pop up automatically, pointing to the Vite dev server. Hack away! 🛠️

---

## 🗂️ Repository Layout

```
ABAI/
├── apps/          # Electron main & React renderer
│   ├── main/
│   └── ui/
├── docs/          # User & dev docs (served via GitHub Pages)
├── packages/      # Plugin SDK & shared libs
├── tests/         # Unit, integration & E2E tests (Vitest + Playwright)
└── .github/       # CI/CD workflows (build, release, pages)
```

---

## 🚚 Release Flow (TL;DR)

1. `pnpm version <major|minor|patch>` – bumps version & creates a _vX.Y.Z_ tag 2._GitHub Actions_ build platform installers → create Release → deploy Docs page
   3.Download badges & Pages site auto-update via workflow

Full details in [RELEASE.md](RELEASE.md).

---

## 👩‍💻 Contributing

Got an idea or found a bug? Open an [issue](https://github.com/skylordafk/A-B-AI/issues) or a PR! Contributions of all sizes and experience levels are welcome.

---

## 📝 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
