## Phase 4 — Provider-Layer Expansion & Normalisation

_Goal: bring every major model family online behind a single adapter interface._

| #   | Task                                                                                                                           | Acceptance / Deliverable                                   | Notes                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------- |
| 4-1 | **Adapter refactor**<br/>• Add `listModels(): ModelMeta[]` (id, name, description, contextSize, pricePrompt, priceCompletion). | Type-safe interface + unit tests for existing adapters.    | Foundation for all later work.                          |
| 4-2 | **Grok provider**<br/>• High-end **Grok 3**.<br/>• Fast tier **Grok-3-mini**.                                                  | `src/providers/grok.ts`; e2e smoke test.                   | Grok pricing is “flat per msg”; store in manifest.      |
| 4-3 | **Gemini provider**<br/>• High-end **Gemini 2.5 Pro-Thinking**.<br/>• Fast tier **Gemini 1.5 Flash-Fast**.                     | `src/providers/gemini.ts`; e2e smoke test.                 | Handle streaming + safety blocks.                       |
| 4-4 | **OpenAI fast tier** → **gpt-4.1-mini**.                                                                                       | Added to existing OpenAI adapter; visible in model picker. |                                                         |
| 4-5 | **Anthropic fast tier** → **Claude 3 Haiku**.                                                                                  | Added to Anthropic adapter; visible in model picker.       | High-end **Opus** and **o3** are already in repo.       |
| 4-6 | **Static pricing manifest** → `modelPricing.json`.                                                                             | CI check ensures every adapter model has a price entry.    | Manual lookup script for now; nightly sync comes later. |

**Exit test:** choose any three new models → send prompt → receive full response + cost line-items.

---

## Phase 5 — Critical UI/UX & Docs Sprint

_Goal: a first-time user can install, add keys once, and have a smooth chat in <5 min._

| #   | Task                                                                                                                                 | Acceptance                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 5-1 | **Markdown renderer fix** – properly split fenced code-blocks so diff viewer isn’t broken.                                           | Three code-block test renders correctly.                              |
| 5-2 | **Loading states** – global spinner / “thinking…” overlay, disable send button, allow cancel token.                                  | Visible until first streamed token.                                   |
| 5-3 | **API-key storage** – persist keys after first entry; expose editable values in _Settings_; never prompt per session unless missing. | Keys survive app restart; bad key shows inline error with “Fix” link. |
| 5-4 | **Session chat history** – retain the entire back-and-forth in memory; only the latest assistant message gets diff viewer.           | Closing the window clears history (cross-session storage TBD).        |
| 5-5 | **30-second Quick-Start docs** – top-of-README and `/docs/first-model.md` walk-through for Windows & macOS.                          | Fresh VM → clone → install → first response in < 5 min.               |

---

## Phase 6 — First Production Build (“good-enough” installer)

_Goal: publish unsigned installers + a download page; defer heavy infra to a later hardening phase._

| #   | Task                                                                                  | Acceptance                                                      |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 6-1 | **Basic tests pass in CI** (lint + unit + minimal Playwright).                        | Green build on `main`.                                          |
| 6-2 | **Electron-builder config** → create `.exe` (NSIS) & `.dmg`/`.zip` on GitHub Actions. | Artifacts appear in the workflow summary.                       |
| 6-3 | **Release download page** – GitHub Pages splash with links & SHA-256 checksums.       | User can click → download → install → app icon in taskbar/dock. |

_Infra-hardening footnote:_ code-signing, auto-update, notarisation, and artifact retention move to **Phase 10**.

---

## Phase 7 — Batch Prompting MVP

Queue CSV/JSON of prompts; route each to the cheapest “fast tier” unless the user pins a model. Provide per-row cost summary.

---

## Phase 8 — Monetization Core Scaffold ✅ [COMPLETE]

_Goal: Add licensing, usage tracking, and metric infrastructure for monetization._

| #   | Task                                                                                                                           | Acceptance / Deliverable                                   | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------ |
| 8-1 | **License Management**<br/>• Stripe activation flow<br/>• Offline validation with 72h cache<br/>• Dev license server          | Working activation UI + license check on startup           | ✅     |
| 8-2 | **Prompt-Coach Metrics**<br/>• Metric registry (similarity, cost, latency)<br/>• Diff viewer with colored badges              | Visual comparison table with metric scores                 | ✅     |
| 8-3 | **Usage History**<br/>• Per-project JSONL logging<br/>• Automatic batch tracking                                              | History files in ~/.abai/history/{project}.jsonl          | ✅     |
| 8-4 | **Project Settings**<br/>• API key management<br/>• Metric toggles<br/>• Request throttling                                   | Settings screen with per-project configuration             | ✅     |
| 8-5 | **Multi-arch Builds**<br/>• macOS: x64 + arm64<br/>• Windows: x64<br/>• CI updates                                           | electron-builder config + workflow updates                 | ✅     |

**Exit test:** License activation → batch run → metrics displayed → history logged.

---

## Phase 9 — Automated Pricing Sync

Nightly script scrapes provider pricing → updates `modelPricing.json` → opens PR.

---

## Phase 10 — Infrastructure Hardening

Code-signing for Win/macOS, delta auto-updates, notarisation, long-term artifact retention, and extended test matrix.

---

### Timeline at a glance

1. **Phase 4** → unblock new models.
2. **Phase 5** → remove biggest papercuts before showing anyone the app.
3. **Phase 6** → “good-enough” installers + download page.
4. **Phase 7–9** → power-user features.
5. **Phase 10** → polish & enterprise trust.
