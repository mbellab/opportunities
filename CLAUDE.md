# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

There is no build step. Serve statically:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## File structure

- `index.html` — HTML skeleton. Contains an inline `<script>` fallback block immediately after `<script src="app.js">` so the app loads correctly when double-clicked (file:// protocol, where Chrome blocks external scripts). The fallback is guarded by `if(!window.APP_LOADED)` — skipped on HTTP since app.js sets that flag on load.
- `app.css` — All styles. Loaded via `<link rel="stylesheet">` which works on both HTTP and file://.
- `app.js` — All JavaScript (~7,500 lines). Current version: v1.7.0 (2026-06-14). First line is `window.APP_LOADED=1;`. Starts with the `CONFIG` block.
- `index.html.bak` — Backup of the original monolithic file before the split.

## Architecture

**Three-file SPA.** No framework, no bundler, no build step. HTML in `index.html`, styles in `app.css`, all JavaScript in `app.js`. All JS state is in global `var` declarations at the top of `app.js`.

**Backend: Cloudflare Worker.** All data access goes through `https://mbb-enquiry-proxy.paul-winick.workers.dev`, which proxies Airtable. The Worker handles auth and exposes REST endpoints:
- `/auth` (POST) — password authentication, returns `{role, name}`
- `/users` — User accounts table (CRUD). Fields: `Name`, `Username`, `Password`, `Role`, `Active`. This is where app login credentials are stored in Airtable.
- `/` — Opportunities table (CRUD)
- `/quotes`, `/invoices`, `/activity`, `/bidders`, `/suppliers`, `/contractors`, `/vendors`, `/quality`, `/employees`, `/renewals`, `/company-docs`, `/petty-cash`, `/passwords`, `/role-permissions`, `/employee-leave` — sub-tables

Every authenticated request sends `X-App-Password` in headers (via `getHeaders()`).

**Auth & session.** `POST /auth` with `{username, password}` returns `{role, name}`. The password and user object are stored in `sessionStorage` as `mbb_pwd` and `mbb_user`. On page load, auto-login is attempted from the cache. Role restrictions are injected as CSS rules via `applyRoleRestrictions()`. Permissions are loaded from `/role-permissions` via `loadPermissions()`.

**User accounts.** Stored in Airtable via `/users` endpoint. Fields: `Name`, `Username`, `Password`, `Role` (admin/engineer/viewer), `Active` (boolean). The Admin screen manages these. To change a user's password, fetch their record from `/users`, get the record ID, then PATCH with the new `Password` field.

**Screen navigation.** Each screen is a DOM element hidden with `display:none`. Navigation functions (`showHome()`, `showOpportunities()`, `showVendors()`, etc.) hide every screen then show the target one. Current screen is persisted to `sessionStorage('mbb_screen')` for reload recovery. Screens:
- `#login-screen`, `#loading`, `#home-screen`
- `#app` (Opportunities)
- `#vendor-screen`, `#dashboard-screen`, `#contractors-screen`, `#suppliers-screen`
- `#quality-screen`, `#employees-screen`, `#renewals-screen`, `#company-docs-screen`
- `#petty-cash-screen`, `#passwords-screen`, `#leave-requests-screen`
- `#employees-leave-screen` (employee leave — admin only)
- `#admin-screen` (user management — admin only)
- `#diag-screen` (diagnostics)

**Opportunities table (`#app`).** The core module. Global state: `allRecords` (raw Airtable records), `items` (parsed/normalized), `filtered` (post-filter). Airtable field names are mapped in the `F` constant (line ~2671). The table supports inline row editing (`editingId` global) and a double-click modal (`openEditModal`). An opportunity detail drawer opens with tabs: Activity Log, Bidders, Quote Tracker, Invoices.

**JS section layout in `app.js`** (each delimited by `// ===...===` comments):
- CONFIG + globals (~1)
- Helpers, date utils, auth (~52)
- Load / Parse / API / Ticks / Edit / Delete / KPIs / Filter+table (~302–950)
- NAVIGATION (~951)
- VENDOR DATA (~1002)
- DASHBOARD (~1334) — 3 tabs: Overview, Tender Calendar, Finance (admin only)
- CONTRACTORS (~1611)
- SUPPLIERS (~1870)
- PRICING DRAWER (~2151)
- ACTIVITY LOG (~2291)
- BIDDERS (~2672)
- QUOTE TRACKER (~2865)
- DUPLICATE OPPORTUNITY (~3065)
- DASHBOARD TABS + TENDER CALENDAR (~3152)
- INVOICES (~3255)
- FINANCE DASHBOARD (~3428)
- QUALITY OBJECTIVES (~3663)
- EMPLOYEES (~3941) — admin only
- RENEWALS (~4255)
- COMPANY DOCS (~4822)
- QUOTE LETTER GENERATOR (~4992)
- PETTY CASH (~5191)
- PASSWORDS (~5756) — password manager for storing external site credentials
- EMPLOYEE LEAVE (~5906)
- ADMIN (~7216) — user account management, admin only

## Key patterns

- `patchRecord(id, fields)` / `postRecord(fields)` / `deleteRecord(id)` — all Airtable writes. Pass `null` to clear a field; `undefined`/empty string is stripped before sending.
- `setSave(state)` — updates the save indicator in the top bar (`'saving'`, `'saved'`, `'err'`).
- `toast(msg, type)` — ephemeral notification (`'ok'`, `'err'`, or default amber).
- Date formats: display uses DD.MM.YYYY (`parseDMY`); Airtable stores ISO (`parseISO`); `parseDateStr` handles both.
- `normStatus(v)` — normalises pipeline status variants to `'PIPELINE'`.
- Role checks: always read from `userRole` global; admin-only screens call `if(!canAccess('...')) { toast(...); return; }` at the top of their show function.
- `canAccess(key)` — checks role permissions loaded from `/role-permissions`.
