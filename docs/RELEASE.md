# Release Guide for A-B/AI Desktop

## Prerequisites

- Node.js 18+ and npm installed
- pnpm installed (`npm install -g pnpm`)
- Windows machine for building Windows releases
- All changes committed to git

## Important Notes

### Dependency Management

All production dependencies from the main app MUST be duplicated in the root package.json. This includes:

- `@ai-sdk/xai`
- `@anthropic-ai/sdk`
- `@dqbd/tiktoken`
- `@google/genai`
- `ai`
- `electron-store`
- `openai`

This is necessary because we exclude workspace node_modules to avoid pnpm symlink issues.

## Building a Windows Release

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Build the Application**

   ```bash
   pnpm build
   ```

3. **Package for Windows**

   ```bash
   pnpm package:win
   ```

   If the NSIS installer isn't created automatically, run:

   ```bash
   npx electron-builder --win nsis --prepackaged dist/win-unpacked
   ```

4. **Output Files**
   - `dist/A-BAI-{version}-Setup.exe` - Windows installer
   - `dist/A-BAI-{version}-Setup.zip` - Portable version

## Troubleshooting

### electron-store Module Not Found Error

This has been fixed by:

- Adding `electron-store` as a root dependency
- Setting `npmRebuild: false` in the build configuration
- Excluding workspace node_modules from packaging

### Symlink Errors During Build

This is caused by pnpm's symlinked node_modules. The current configuration handles this by:

- Only packaging the root node_modules
- Excluding apps/\*/node_modules from the build

### NSIS Installer Not Created

If only the ZIP file is created, manually build the NSIS installer:

```bash
npx electron-builder --win nsis --prepackaged dist/win-unpacked
```

## GitHub Release Process

1. Test the installer locally
2. Create a new GitHub release at https://github.com/skylordafk/A-B-AI/releases/new
3. Tag version: `v{version}` (e.g., `v1.0.2`)
4. Upload the `A-BAI-{version}-Setup.exe` file
5. Add release notes from `release-notes.md`
6. Publish the release

## Version Bumping

Before creating a release, update the version in:

- `package.json` (root)
- `release-notes.md` (add new version section)
