# AGENTS.md — Mandatory AI Agent Operating Protocol & Memory Rules
> **Applies to:** Antigravity, Cursor, Claude Code, Gemini CLI, Copilot Workspace, and all autonomous AI coding agents.
> **Repository:** GeetKosh (गीतकोश) — Nepali Synchronized Lyrics & AI Music Discovery Platform.

---

## 1. Prime Directives (Non-Negotiable)

1. **Context First:**
   Before proposing or making any code changes, you MUST read:
   - [`docs/agent/OBJECTIVES.md`](./docs/agent/OBJECTIVES.md) — Product vision & active milestones.
   - [`docs/agent/ARCHITECTURE.md`](./docs/agent/ARCHITECTURE.md) — System stack, domains, & routing rules.
   - [`docs/agent/COMPONENTS.md`](./docs/agent/COMPONENTS.md) — Existing components & services catalog.

2. **Component Re-Use (Never Reinvent the Wheel):**
   - Check [`docs/agent/COMPONENTS.md`](./docs/agent/COMPONENTS.md) before writing any UI component, state hook, or backend service.
   - Reuse existing design tokens (Simrik Vermilion `#C81E1E`, Studio Vinyl Night `#0E0E10`, Lokta Paper `#FAF7F2`).
   - Do NOT create duplicate player docks, audio players, API clients, or database connection classes.

3. **Strict Zero-Cost & Quota Protection:**
   - **YouTube Data API v3:** NEVER call `search.list` (100 units). ONLY call `videos.list` (1 unit) and `playlistItems.list` (1 unit). Always verify `status.embeddable === true`.
   - **Google Gemini:** Use `gemini-2.5-flash` with strict structured JSON schema (`responseMimeType: "application/json"`).
   - **Cloudflare Pages:** Maintain `wrangler.jsonc` with `"build": { "command": "npm run build" }` and `"not_found_handling": "single-page-application"`. NEVER create `public/_redirects` (causes infinite loop code 100324).

4. **Devanagari Typography Protection:**
   - Never clip Devanagari upper/lower diacritics (matras / hrasva / deergha / reph).
   - All lyric lines MUST enforce `line-height: 2.05` and vertical padding (`padding-block: 0.25rem`).

5. **Track Every Change in Markdown:**
   - When completing any feature, schema modification, or bug fix, you MUST append a record to [`docs/agent/CHANGELOG.md`](./docs/agent/CHANGELOG.md).
   - If you introduce a new reusable component or service, register it in [`docs/agent/COMPONENTS.md`](./docs/agent/COMPONENTS.md).

---

## 2. Multi-Repository Ecosystem

This project is organized into three separate, focused Git repositories:
1. **Frontend:** `frontend/` &rarr; Remote: `https://github.com/sandipkc7/geet-frontend.git`
   - Production Domain: `https://geet.sandipkc.com.np`
   - Deploy: Auto-built on Cloudflare Pages via push to `main`.
2. **Backend:** `backend/` &rarr; Remote: `https://github.com/sandipkc7/geet-backend.git`
   - Production Domain: `https://geet-backend.sandipkc.com.np`
   - Deploy: Auto-pulled via GitHub Webhook (`/api/webhook/deploy`) or Web Console (`/migrate`).
3. **Chrome Extension:** `chrome-extension/` &rarr; Remote: `https://github.com/sandipkc7/geet-chrome.git`
   - Purpose: Zero-quota YouTube music, metadata, and synchronized lyrics harvester.
   - Target: Packaged Manifest V3 extension loadable in Chrome/Edge.

> [!WARNING]
> Always execute git commands inside the respective subdirectory (`cd frontend` or `cd backend`). Never push frontend code to the backend repository or vice versa.

---

## 3. Database Schema Changes Protocol

1. NEVER manually edit tables or run ad-hoc SQL in production without a tracked migration file.
2. Place all new schema changes in `backend/database/migrations/{sequence}_{description}.sql`.
3. Test locally using `php scripts/migrate.php` or the web interface `https://geet-backend.sandipkc.com.np/migrate`.
4. The GitHub Webhook automatically applies pending migrations when pushed to `main`.

---

## 4. Quick Reference Links

* **System Objectives:** [`docs/agent/OBJECTIVES.md`](./docs/agent/OBJECTIVES.md)
* **System Architecture:** [`docs/agent/ARCHITECTURE.md`](./docs/agent/ARCHITECTURE.md)
* **Reusable Component Catalog:** [`docs/agent/COMPONENTS.md`](./docs/agent/COMPONENTS.md)
* **Agent Decision & Change Ledger:** [`docs/agent/CHANGELOG.md`](./docs/agent/CHANGELOG.md)
* **Deployment Guide:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)
