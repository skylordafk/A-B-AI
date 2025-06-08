# ABAI Desktop App

[![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/skylordafk/A-B-AI/releases)
[![macOS](https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/skylordafk/A-B-AI/releases)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

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

## Next Steps

Refer to `docs/ROADMAP.md` for the complete development roadmap.
