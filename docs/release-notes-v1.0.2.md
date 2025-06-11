# A-B/AI Desktop v1.0.2

## 🎉 Release Highlights

This release fixes critical packaging issues that prevented the application from running properly on Windows. The installer now works correctly and includes all necessary dependencies.

## 🐛 Bug Fixes

### Fixed Missing Dependencies

- **Issue**: Application failed to start with "Cannot find module 'openai'" error
- **Solution**: Added all AI provider dependencies (`openai`, `@anthropic-ai/sdk`, `@google/genai`, etc.) to the root package.json to ensure they're included in the packaged application

### Fixed Electron Store Module Error

- **Issue**: `ERR_UNSUPPORTED_ESM_URL_SCHEME` error when launching the application
- **Solution**:
  - Removed unnecessary `electron-store` dependency from UI package
  - Added `electron-store` to root dependencies
  - Configured proper exclusions for workspace node_modules to avoid pnpm symlink issues

### Fixed Slow Packaging Process

- **Issue**: Packaging took extremely long time and got stuck during ZIP creation
- **Solution**:
  - Enabled ASAR packaging for better file bundling
  - Changed compression from 'maximum' to 'normal'
  - Added extensive exclusions for unnecessary files (source maps, TypeScript files, docs, tests, etc.)

## 📦 Technical Changes

- **Build Configuration**:

  - `asar: true` - Enabled ASAR packaging
  - `compression: 'normal'` - Optimized compression settings
  - `npmRebuild: false` - Disabled npm rebuild to avoid symlink issues
  - Added comprehensive file exclusions to reduce package size

- **Dependencies**:
  - All production dependencies are now duplicated at the root level
  - This ensures compatibility with pnpm's symlinked node_modules structure

## 📥 Installation

Download the installer for your platform:

- **Windows**: `A-BAI-1.0.2-Setup.exe` (87.7 MB)
- **macOS**: Coming soon

## 🔧 For Developers

If you're building from source, make sure to:

1. Use `pnpm install` to install dependencies
2. Run `pnpm build` before packaging
3. Use `pnpm package:win` to create Windows installer

## 📝 Known Issues

- macOS builds are not yet available through automated releases
- First-time users need to set up API keys in Settings (File → Settings)

## 🙏 Acknowledgments

Thank you to everyone who reported issues with v1.0.1. Your feedback helped us identify and fix these critical problems quickly.

---

**Full Changelog**: https://github.com/skylordafk/A-B-AI/compare/v1.0.1...v1.0.2
