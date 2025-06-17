# A-B/AI – Your Multi-Model Desktop Copilot

[![Version](https://img.shields.io/github/v/release/skylordafk/A-B-AI?include_prereleases&label=Version)](https://github.com/skylordafk/A-B-AI/releases)
[![Downloads](https://img.shields.io/github/downloads/skylordafk/A-B-AI/total?label=Downloads)](https://github.com/skylordafk/A-B-AI/releases)
[![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white)](https://skylordafk.github.io/A-B-AI/download.html)
[![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)](https://skylordafk.github.io/A-B-AI/download.html)
[![GitHub stars](https://img.shields.io/github/stars/skylordafk/A-B-AI?style=social)](https://github.com/skylordafk/A-B-AI/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/skylordafk/A-B-AI?label=Issues)](https://github.com/skylordafk/A-B-AI/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/skylordafk/A-B-AI)](https://github.com/skylordafk/A-B-AI/commits/master)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Download](https://img.shields.io/badge/Download-App-brightgreen?logo=github)](https://skylordafk.github.io/A-B-AI/download.html)

> **A-B/AI** lets you chat with multiple AI models side-by-side, crunch thousands of prompts in bulk, and compare costs – all in a slick cross-platform desktop app.

---

## ✨ Highlights

|                                 |                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💬 **Multi-Model Chat**         | Converse with OpenAI, Anthropic, Gemini, Grok and more in one tab – complete with token & cost tracking.                                                        |
| 📊 **Batch Processing**         | Import CSV/JSON, estimate cost, run thousands of prompts in parallel, stream results live, and export to CSV – with automatic retries & per-row error handling. |
| 🧮 **Real-Time Cost Analytics** | Built-in pricing DB for 30+ models. Know the bill _before_ you click _Send_.                                                                                    |
| 📈 **Diff Viewer**              | Quickly visualise model output differences and regressions.                                                                                                     |
| 🌓 **Beautiful Themes**         | Light & Dark (and it actually remembers your choice).                                                                                                           |
| 🔑 **License Activation**       | Offline-friendly commercial licensing with encrypted local storage.                                                                                             |
| 🖇️ **Plugin SDK**               | Extend A-B/AI with custom providers or tools – see [`packages/abai-plugin-sdk`](packages/abai-plugin-sdk).                                                      |
| ⚡ **Blazing Fast**             | Vite + React + Electron and a carefully-tuned cache layer.                                                                                                      |

---

## 📥 Download

Grab the latest signed installers from the **Download** badge above or head to our GitHub Pages mirror:

👉 **https://skylordafk.github.io/A-B-AI/download.html**

The page always points to the most recent stable release on the [Releases](https://github.com/skylordafk/A-B-AI/releases) tab.

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
