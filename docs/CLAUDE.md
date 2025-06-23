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
- `src/db/`: Database layer with SQLite integration

**UI Process (`apps/ui/`):**

- `src/AppRouter.tsx`: Route configuration
- `src/contexts/`: React contexts for state management (Chat, Batch, Project, Theme)
- `src/components/`: Reusable UI components
- `src/routes/`: Page components
- `src/lib/batch/`: Batch processing logic and job queue

## Common Development Commands

```bash
# Development (starts both UI and main process with hot reload)
npm run dev

# Build entire application (with Turbo caching)
npm run build

# Type checking across all packages (with Turbo caching)
npm run typecheck

# Run all tests
npm test

# Run with UI for tests
npm run test:ui

# Run end-to-end tests
npm run test:e2e

# Lint code (with Turbo caching and parallel execution)
npm run lint

# Format code
npm run format

# Package application for distribution
npm run package          # Current platform
npm run package:win      # Windows
npm run package:mac      # macOS

# Turbo-specific commands
npx turbo run build --dry  # Show what would run without executing
npx turbo run build --force  # Force rebuild ignoring cache
npx turbo run lint --parallel  # Run linting in parallel (default)
```

## Testing

- **Unit tests**: Vitest (`tests/` directory)
- **Component tests**: React Testing Library with jsdom
- **E2E tests**: Playwright (`tests/playwright/`)
- **Integration tests**: Various provider and pricing tests

Run specific test suites:

```bash
# Single test file
npm test tests/batch/JobQueue.test.ts

# Component tests (jsdom environment)
npm test tests/components/

# Skip integration tests that require API keys
npm test --exclude="**/*.skip.ts"
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

- Use `npm` for package management (workspace configuration in root package.json)
- TypeScript is used throughout with strict configuration
- Settings are persisted using `electron-store`
- Job state is saved to `~/.abai/jobqueue/` for persistence
- History logging is saved to `~/.abai/history/`
- The app includes a licensing system that's bypassed in development mode

## Build System

- **Turbo**: Monorepo task runner with intelligent caching and parallel execution
- **electron-vite**: Unified build system for both main and renderer processes  
- **Hot reload**: Development mode supports hot reload for both processes
- **TypeScript**: Incremental compilation with build info caching for faster rebuilds
- **esbuild**: Fast bundling for production builds
- **Caching**: File-based hashing for optimal cache invalidation and 98% faster rebuilds

### Performance Optimizations

- **Build caching**: Turbo caches successful builds, reducing rebuild time from 2.8s to 98ms (98% faster)
- **Incremental TypeScript**: Only recompiles changed files using `tsBuildInfoFile`
- **Parallel execution**: Tasks run in parallel across workspaces when possible
- **Smart invalidation**: Cache invalidates only when inputs change (source files, configs)
- **CI/CD Pipeline**: Single streamlined workflow with automated releases and error tracking

## Key File Locations

- Application settings: Managed by electron-store in user data directory
- Job queue state: `~/.abai/jobqueue/`
- History files: `~/.abai/history/` (JSONL format)
- Pricing data: `data/model-pricing.json`
- Templates: `data/templates/batch/`

## Code Style Notes

- ESLint and Prettier are configured for consistent formatting
- Use React contexts for state management rather than external state libraries
- Provider implementations should handle their own error states and token counting
- Batch processing jobs should be resumable and handle failures gracefully