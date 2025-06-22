# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A-B/AI is a cross-platform Electron desktop application for comparing AI models side-by-side. The app features multi-model chat comparisons, batch processing capabilities, cost analysis, and a plugin system.

## Architecture

This is a monorepo with two main applications:

- **`apps/main/`**: Electron main process (Node.js/TypeScript) - handles API calls, settings, IPC
- **`apps/ui/`**: React frontend (TypeScript/Vite) - user interface and components

### Key Architectural Components

**Main Process (`apps/main/`):**

- `src/main.ts`: Entry point, window management, IPC handlers
- `src/providers/`: AI provider implementations (OpenAI, Anthropic, Gemini, Grok)
- `src/settings.ts`: Application settings and API key management
- `src/chatController.ts`: Chat orchestration logic
- `src/licensing/`: License validation system

**UI Process (`apps/ui/`):**

- `src/AppRouter.tsx`: Route configuration
- `src/contexts/`: React contexts for state management (Chat, Batch, Project, Theme)
- `src/components/`: Reusable UI components
- `src/routes/`: Page components
- `src/lib/batch/`: Batch processing logic and job queue

## Common Development Commands

```bash
# Development (starts both UI and main process with hot reload)
pnpm dev

# Build entire application
pnpm build

# Run all tests
pnpm test

# Run with UI for tests
pnpm test:ui

# Run end-to-end tests
pnpm test:e2e

# Lint code
pnpm lint

# Format code
pnpm format

# Package application for distribution
pnpm package          # Current platform
pnpm package:win      # Windows
pnpm package:mac      # macOS
```

## Testing

- **Unit tests**: Vitest (`tests/` directory)
- **Component tests**: React Testing Library with jsdom
- **E2E tests**: Playwright (`tests/playwright/`)
- **Integration tests**: Various provider and pricing tests

Run specific test suites:

```bash
# Single test file
pnpm test tests/batch/JobQueue.test.ts

# Component tests (jsdom environment)
pnpm test tests/components/

# Skip integration tests that require API keys
pnpm test --exclude="**/*.skip.ts"
```

## AI Provider System

The app uses a modular provider system in `apps/main/src/providers/`:

- Each provider implements the same interface (chat, listModels, etc.)
- Providers handle model-specific token counting and pricing
- Advanced features like prompt caching are provider-specific
- New providers can be added by implementing the base interface

## Batch Processing

The batch system (`apps/ui/src/lib/batch/`) supports:

- CSV/JSON input parsing
- Parallel job execution with retry logic
- Cost estimation before execution
- Export to multiple formats
- Job queue persistence across app restarts

## Important Development Notes

- Use `pnpm` for package management (workspace configuration in `pnpm-workspace.yaml`)
- TypeScript is used throughout with strict configuration
- Settings are persisted using `electron-store`
- Job state is saved to `~/.abai/jobqueue/` for persistence
- History logging is saved to `~/.abai/history/`
- The app includes a licensing system that's bypassed in development mode

## Key File Locations

- Application settings: Managed by electron-store in user data directory
- Job queue state: `~/.abai/jobqueue/`
- History files: `~/.abai/history/` (JSONL format)
- Pricing data: `data/ai-model-pricing.json`
- Templates: `data/templates/batch/`

## Code Style Notes

- ESLint and Prettier are configured for consistent formatting
- Use React contexts for state management rather than external state libraries
- Provider implementations should handle their own error states and token counting
- Batch processing jobs should be resumable and handle failures gracefully
