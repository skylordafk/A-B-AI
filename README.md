# A-B/AI – Your Multi-Model Desktop Copilot

[![Version](https://img.shields.io/github/v/release/skylordafk/A-B-AI?include_prereleases&label=Version)](https://github.com/skylordafk/A-B-AI/releases)
[![Downloads](https://img.shields.io/github/downloads/skylordafk/A-B-AI/total?label=Downloads)](https://github.com/skylordafk/A-B-AI/releases)
[![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white)](https://skylordafk.github.io/A-B-AI/download.html)
[![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)](https://skylordafk.github.io/A-B-AI/download.html)
[![GitHub issues](https://img.shields.io/github/issues/skylordafk/A-B-AI?label=Issues)](https://github.com/skylordafk/A-B-AI/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/skylordafk/A-B-AI)](https://github.com/skylordafk/A-B-AI/commits/master)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/skylordafk/A-B-AI)
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

**Performance & Developer Experience:**

- **⚡ Lightning Fast Builds** – Turbo-powered caching reduces build time from 2.8s → 98ms (98% faster)
- **🔄 Incremental TypeScript** – Smart compilation with file-based caching for rapid iteration
- **🔧 Optimized Startup** – 30-50ms faster app launch via simplified dependency management
- **🚀 Modern CI/CD** – Single streamlined pipeline with automated releases and error tracking

---

## 📥 Download

Grab the latest signed installers from the **Download** badge above or head to our GitHub Pages mirror:

👉 **https://skylordafk.github.io/A-B-AI/download.html**

The page always points to the most recent stable release on the [Releases](https://github.com/skylordafk/A-B-AI/releases) tab.

---

## 🚀 Quick Start

1. **Download & Install** – Get the latest version from the download page above
   - **macOS Users**: If you see a security warning about the disk not being readable, use this Terminal workaround:
     ```bash
     # Replace with your actual DMG filename
     hdiutil attach A-B-AI-1.3.0-arm64.dmg -nobrowse -quiet
     cp -R "/Volumes/A-B-AI 1.3.0-arm64/A-B-AI.app" /Applications/
     sudo xattr -r -d com.apple.quarantine /Applications/A-B-AI.app
     hdiutil detach "/Volumes/A-B-AI 1.3.0-arm64" -quiet
     open /Applications/A-B-AI.app
     ```
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

# 2. Install deps (monorepo managed by npm with Turbo)
 npm ci

# 3. Run the app with hot reload
 npm run dev

# 4. Build with intelligent caching (98% faster rebuilds)
 npm run build

# 5. Run type checking across all packages
 npm run typecheck
```

The Electron window will pop up automatically, pointing to the Vite dev server. 

🚀 **Performance**: This project uses **Turbo** for intelligent build caching - subsequent builds complete in ~98ms vs 2.8s initial build!

---

## 🗂️ Repository Layout

```
A-B-AI/
├── apps/              # Electron main & React renderer processes
│   ├── main/          # Node.js main process (IPC, providers, settings)
│   └── ui/            # React renderer (components, UI logic)
├── docs/              # Documentation (served via GitHub Pages)
├── tests/             # Unit, integration & E2E tests (Vitest + Playwright)
├── turbo.json         # Turbo pipeline configuration (build caching)
├── .github/           # CI/CD workflows with Turbo caching
└── tsconfig*.json     # TypeScript configs with incremental compilation
```

**Build System**: This monorepo uses **Turbo** for intelligent task execution and caching, enabling 98% faster rebuilds and optimized CI/CD pipelines.

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

## 🧠 OpenAI o-series Reasoning Models

A-B/AI now fully supports OpenAI's new _o-series_ (o3, o4-mini …) with automatic routing:

| Feature                 | Behaviour                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Single developer prompt | CSV template `basic-template-o.csv` ships with a single **developer** column as required by o-series.                        |
| Parameter mapping       | `max_completion_tokens` + `reasoning_effort` are injected automatically; legacy models keep `max_tokens`.                    |
| Strict JSON             | Enable **Settings → Strict JSON** to add `response_format:{type:"json_object"}` plus `"strict":true` on any function schema. |
| Web search              | When enabled, o-series calls go through the **Responses API** with the `web_search_preview` tool.                            |
| Batch API               | Large CSV runs are queued through `openai.batches.create`, giving ~50 % cost savings.                                        |

Grab the specialised template from **Batch → Browse Templates → "Basic Template (o-series)"**.
