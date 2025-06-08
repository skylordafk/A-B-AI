# Build Resources

This directory contains resources used by electron-builder during the packaging process.

## Required Files

### Icons

- **icon.ico** - Windows icon (at least 256x256)
- **icon.icns** - macOS icon
- **icon.png** - Linux icon (512x512 or 1024x1024)

### Icon Generation

You can use tools like:

- [electron-icon-builder](https://github.com/safu9/electron-icon-builder)
- [IconSet Creator](https://apps.apple.com/us/app/iconset-creator/id939343785) (macOS)
- Online converters

### Temporary Placeholder

For now, electron-builder will use default Electron icons if these files are missing.
