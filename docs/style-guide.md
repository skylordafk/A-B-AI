# ABAI UI Style Guide (Light / Dark Themes)

This document centralises the base neutrals used across the application. Whenever you add new components, reference these **tokens** instead of hard-coding colour utility classes.

| Token              | Light value           | Dark value            | Typical Tailwind class         |
| ------------------ | --------------------- | --------------------- | ------------------------------ |
| `--bg-primary`     | `#f5f5f4` (stone-100) | `#292524` (stone-800) | `bg-[var(--bg-primary)]`       |
| `--bg-secondary`   | `#fafaf9` (stone-50)  | `#1c1917` (stone-900) | `bg-[var(--bg-secondary)]`     |
| `--bg-tertiary`    | `#e7e5e4`             | `#44403c`             | `bg-[var(--bg-tertiary)]`      |
| `--bg-hover`       | `#d6d3d1`             | `#57534e`             | `bg-[var(--bg-hover)]`         |
| `--border`         | `#d6d3d1` (stone-300) | `#44403c` (stone-700) | `border-[var(--border)]`       |
| `--text-primary`   | `#1c1917` (stone-900) | `#fafaf9` (stone-50)  | `text-[var(--text-primary)]`   |
| `--text-secondary` | `#3f3f3f` (stone-700) | `#d6d3d1` (stone-300) | `text-[var(--text-secondary)]` |
| `--text-muted`     | `#57534e` (stone-600) | `#d6d3d1` (stone-300) | `text-[var(--text-muted)]`     |

## Accent Colors

| Token                    | Light value | Dark value | Usage                       |
| ------------------------ | ----------- | ---------- | --------------------------- |
| `--accent-primary`       | `#3b82f6`   | `#2563eb`  | Primary buttons, links      |
| `--accent-primary-hover` | `#2563eb`   | `#3b82f6`  | Primary button hover state  |
| `--accent-success`       | `#10b981`   | `#059669`  | Success buttons, indicators |
| `--accent-success-hover` | `#059669`   | `#10b981`  | Success button hover state  |
| `--accent-danger`        | `#ef4444`   | `#dc2626`  | Delete buttons, warnings    |
| `--accent-danger-hover`  | `#dc2626`   | `#ef4444`  | Danger button hover state   |

## Tab Bar Colors

| Token               | Light value | Dark value | Usage                  |
| ------------------- | ----------- | ---------- | ---------------------- |
| `--tab-bg`          | `#e7e5e4`   | `#44403c`  | Tab button background  |
| `--tab-hover`       | `#d6d3d1`   | `#57534e`  | Tab button hover state |
| `--tab-active`      | `#3b82f6`   | `#3b82f6`  | Active tab background  |
| `--tab-text`        | `#1c1917`   | `#fafaf9`  | Tab button text        |
| `--tab-text-active` | `#ffffff`   | `#ffffff`  | Active tab text        |

## How to use tokens

1. The variables are declared in `apps/ui/src/index.css`:

```css
:root {
  --bg-primary: #f5f5f4;
  --bg-secondary: #fafaf9;
  --bg-tertiary: #e7e5e4;
  --bg-hover: #d6d3d1;
  --border: #d6d3d1;
  --text-primary: #1c1917;
  --text-secondary: #3f3f3f;
  --text-muted: #57534e;
}
.dark {
  --bg-primary: #292524;
  --bg-secondary: #1c1917;
  --bg-tertiary: #44403c;
  --bg-hover: #57534e;
  --border: #44403c;
  --text-primary: #fafaf9;
  --text-secondary: #d6d3d1;
  --text-muted: #d6d3d1;
}
```

2. In JSX/TSX files, prefer arbitrary-value classes, e.g.:

```jsx
<div className="bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)]" />
```

3. Avoid `bg-white`, `bg-stone-900`, etc. unless the colour is intentionally **not** theme-aware.

## Extending / presets

• To add brand colours or additional neutrals, append new variables in the same blocks and document them here.
• When we later expose theme presets in the Settings modal, we can populate these variables at runtime (e.g. by swapping a `data-theme` attribute or injecting a `<style>` tag). All components that follow the token approach will automatically adopt the new palette.

## Reusable UI patterns

### Settings Modal

The modal and all its controls should reference the neutral tokens above for background, border and text. When adding new controls:

- Modal panel background → `bg-[var(--bg-primary)]`
- Section headers / labels → `text-[var(--text-primary)]`
- Input borders → `border-[var(--border)]`
- Muted hints / validation status → `text-[var(--text-muted)]`

### Window Controls Bar (File / Settings / Minimise / Close)

A shared top-bar component lives in `apps/ui/src/components/WindowControlsBar.tsx`. It uses the same neutrals:

- Bar background → `bg-[var(--bg-secondary)]`
- Icon buttons background → `hover:bg-[var(--bg-primary)]`
- Icon colour → `text-[var(--text-primary)]`
- Divider lines → `border-[var(--border)]`

Add future buttons/menus by following the same variable-driven approach so that new theme presets automatically apply.
