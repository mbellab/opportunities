# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

There is no build step. Serve statically:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## File structure

- `index.html` — HTML skeleton (~8,500 lines). Contains an inline `<script>` fallback block immediately after `<script src="app.js">` so the app loads correctly when double-clicked (file:// protocol, where Chrome blocks external scripts). The fallback is guarded by `if(!window.APP_LOADED)` — skipped on HTTP since app.js sets that flag on load.
- `app.css` — All styles (607 lines, 43KB). Loaded via `<link rel="stylesheet">` which works on both HTTP and file://.
- `app.js` — All JavaScript (6,315 lines, 356KB). First line is `window.APP_LOADED=1;`. Starts with the `CONFIG` block and ends with the DOMContentLoaded Enter-key listener.
- `index.html.bak` — Backup of the original monolithic file before the split.

## Architecture

**Three-file SPA.** No framework, no bundler, no build step. HTML in `index.html`, styles in `app.css`, all JavaScript in `app.js`. All JS state is in global `var` declarations at the top of `app.js`.

**Backend: Cloudflare Worker.** All data access goes through `https://mbb-enquiry-proxy.paul-winick.workers.dev`, which proxies Airtable. The Worker handles auth and exposes REST endpoints:
- `/auth` (POST) — password authentication, returns `{role, name}`
- `/` — Opportunities table (CRUD)
- `/quotes`, `/invoices`, `/activity`, `/bidders`, `/suppliers`, `/contractors`, `/vendors`, `/quality`, `/employees`, `/renewals`, `/company-docs`, `/petty-cash` — sub-tables

Every authenticated request sends `X-App-Password` in headers (via `getHeaders()`).

**Auth & session.** `POST /auth` with `{username, password}` returns a role (`admin`, `viewer`, `engineer`). The password and user object are stored in `sessionStorage` as `mbb_pwd` and `mbb_user`. On page load, auto-login is attempted from the cache. Role restrictions are injected as CSS rules via `applyRoleRestrictions()`.

**Screen navigation.** Each screen is a DOM element hidden with `display:none`. Navigation functions (`showHome()`, `showOpportunities()`, `showVendors()`, etc.) hide every screen then show the target one. Current screen is persisted to `sessionStorage('mbb_screen')` for reload recovery. Screens: `#login-screen`, `#loading`, `#home-screen`, `#app` (Opportunities), `#vendor-screen`, `#dashboard-screen`, `#contractors-screen`, `#suppliers-screen`, `#quality-screen`, `#employees-screen`, `#renewals-screen`, `#company-docs-screen`.

**Opportunities table (`#app`).** The core module. Global state: `allRecords` (raw Airtable records), `items` (parsed/normalized), `filtered` (post-filter). Airtable field names are mapped in the `F` constant (line ~2666). The table supports inline row editing (`editingId` global) and a double-click modal (`openEditModal`). An opportunity detail drawer opens with tabs: Activity Log, Bidders, Quote Tracker, Invoices.

**JS section layout in `app.js`** (each delimited by `// ===...===` comments):
- CONFIG + globals (~1)
- Helpers, date utils, auth (~52)
- Load / Parse / API / Ticks / Edit / Delete / KPIs / Filter+table (~302–849)
- NAVIGATION (~850)
- VENDOR DATA (~899)
- DASHBOARD (~1231) — 3 tabs: Overview, Tender Calendar, Finance (admin only)
- CONTRACTORS (~1507)
- SUPPLIERS (~1765)
- PRICING DRAWER (~2045)
- ACTIVITY LOG (~2185)
- BIDDERS (~2566)
- QUOTE TRACKER (~2759)
- DUPLICATE OPPORTUNITY (~2959)
- DASHBOARD TABS + TENDER CALENDAR (~3046)
- INVOICES (~3149)
- FINANCE DASHBOARD (~3322)
- QUALITY OBJECTIVES (~3557)
- EMPLOYEES (~3834) — admin only
- RENEWALS (~4132)
- COMPANY DOCS (~4698)
- PETTY CASH (~5066)

## Key patterns

- `patchRecord(id, fields)` / `postRecord(fields)` / `deleteRecord(id)` — all Airtable writes. Pass `null` to clear a field; `undefined`/empty string is stripped before sending.
- `setSave(state)` — updates the save indicator in the top bar (`'saving'`, `'saved'`, `'err'`).
- `toast(msg, type)` — ephemeral notification (`'ok'`, `'err'`, or default amber).
- Date formats: display uses DD.MM.YYYY (`parseDMY`); Airtable stores ISO (`parseISO`); `parseDateStr` handles both.
- `normStatus(v)` — normalises pipeline status variants to `'PIPELINE'`.
- Role checks: always read from `userRole` global; admin-only screens call `if(userRole !== 'admin') { toast(...); return; }` at the top of their show function.
