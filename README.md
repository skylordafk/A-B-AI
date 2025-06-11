# ABAI Desktop App

[![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/skylordafk/A-B-AI/releases)
[![macOS](https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/skylordafk/A-B-AI/releases)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

## 📥 Download

Download the latest version of A-B/AI for your platform:

| Platform | Download                                                                                               | Version |
| -------- | ------------------------------------------------------------------------------------------------------ | ------- |
| Windows  | [A-BAI-Setup.exe](https://github.com/skylordafk/A-B-AI/releases/latest/download/A-BAI-1.0.2-Setup.exe) | v1.0.2  |
| macOS    | Coming Soon                                                                                            | -       |

> **Note**: macOS support is in development. For now, macOS users can build from source using the instructions below.

## 🚀 30-Second Quick Start

```bash
# Clone and install
git clone https://github.com/skylordafk/A-B-AI.git
cd A-B-AI
pnpm install

# Run the app
pnpm dev

# Enter your API keys in Settings (File → Settings)
# Start chatting with multiple AI models!
```

**That's it!** The app will open automatically. See [First Model Guide](docs/first-model.md) for detailed setup.

---

## 📊 Batch Prompting MVP

Process multiple prompts efficiently with our new batch processing feature:

- **CSV/JSON Import**: Upload files with multiple prompts
- **Cost Estimation**: Preview costs before running
- **Parallel Processing**: Adjust concurrency (1-10 requests)
- **Progress Tracking**: Real-time updates with ETA
- **Export Results**: Download CSV results and job manifests

### Quick Example

1. Click the dropdown arrow next to "Send" → "Open Batch Prompting..."
2. Upload a CSV file with your prompts:
   ```csv
   prompt,model,system,temperature
   "What is AI?",openai/gpt-4.1-mini,"You are a helpful assistant",0.7
   "Explain ML",anthropic/claude-3-haiku,,0.5
   ```
3. Review cost estimate and click "Run Batch"
4. Export results when complete

See [Batch Documentation](docs/batch.md) for detailed instructions.

---

## About

A desktop application built with Electron, Vite, and React for AI model comparison and cost analysis.

## Project Structure

This is a monorepo managed by pnpm with the following structure:

```
ABAI/
├── apps/
│   ├── main/      # Electron main process
│   └── ui/        # React UI (Vite)
├── docs/          # Documentation
├── tests/         # Test files
└── package.json   # Root workspace config
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Setup

1. Clone the repository:

```bash
git clone https://github.com/skylordafk/A-B-AI.git
cd A-B-AI
```

2. Install dependencies:

```bash
pnpm install
```

## Development

Run the app in development mode with hot-reload:

```bash
pnpm dev
```

This will:

- Start the Vite dev server for the React UI
- Launch Electron with the dev server URL
- Open DevTools in detached mode

## Building

Build all packages:

```bash
pnpm build
```

## Production

Run the built app:

```bash
pnpm start:prod
```

## Scripts

- `pnpm dev` - Start development environment
- `pnpm build` - Build all packages
- `pnpm start:prod` - Run production build
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

## Architecture

- **Main Process** (`apps/main`): Handles window management, native menus, and system integration
- **Renderer Process** (`apps/ui`): React application with Tailwind CSS for styling
- **Preload Script**: Provides secure IPC communication between main and renderer

## Menu

The app includes a native menu with:

- File → Settings (placeholder for future implementation)
- File → Quit

## Technology Stack

- **Electron** - Desktop framework
- **React** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **pnpm** - Package management
- **ESLint** & **Prettier** - Code quality
- **Husky** & **lint-staged** - Git hooks

## CI/CD

GitHub Actions workflow runs on push/PR to:

- Lint code
- Build packages
- Test on Windows and macOS with Node.js 18.x and 20.x

## Documentation

- [Release Process](./RELEASE.md) - Step-by-step guide for creating new releases
- [Batch Processing Guide](./docs/batch.md) - Detailed documentation on batch processing features
- [Usage Guide](./USAGE.md) - Complete application usage instructions
- [Model & Pricing Updates](./docs/MODEL_PRICING_UPDATE_PROCESS.md) - How to update AI models and pricing

## Next Steps

Refer to `docs/ROADMAP.md` for the complete development roadmap.
