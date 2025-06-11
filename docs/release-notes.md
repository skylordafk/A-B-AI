# Release Notes

## Version 1.0.2 (2024-12-22)

### Fixed

- Fixed missing AI provider dependencies (openai, anthropic, etc.) in packaged app
- Fixed slow packaging process by enabling ASAR and optimizing compression
- Reduced installer size by excluding unnecessary files from node_modules

### Changed

- Added all AI provider dependencies to root package.json
- Enabled ASAR packaging for better performance
- Changed compression from 'maximum' to 'normal' for faster builds
- Added more exclusions for unnecessary files in production build

## Version 1.0.1 (2024-12-22)

## 🎉 A-B-AI v1.0.0

### ✨ Features

- Multi-model AI chat support (OpenAI, Anthropic, Gemini, Grok)
- Real-time cost tracking
- Model comparison
- Cross-platform desktop application

### 🐛 Bug Fixes

- Fixed missing electron-store dependency
- Fixed macOS copy/paste functionality with proper menu implementation
- Added full keyboard shortcut support (Cmd+C/V/X) on macOS

### 📥 Downloads

- **Windows**: Download `A-B-AI-1.0.0-win-x64.zip` and extract
- **macOS**: Download `.dmg` file (build on macOS with `pnpm package:mac`)

### 🚀 Installation

**Windows**: Extract the zip and run `A-B-AI.exe`
**macOS**: Open the .dmg file and drag A-B-AI to Applications
