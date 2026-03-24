## Context

This repository is currently an empty project shell with OpenSpec initialized, so the extension will be introduced as a new codebase rather than incrementally modifying an existing local implementation. The target product is a legally distinct reading-list browser extension inspired by the workflow of the referenced store listing, but implemented with a new architecture, a normalized storage model, and a redesigned popup UI centered around folders on the left side.

The extension must work across Chromium-based browsers and Firefox, preserve quick-save ergonomics, and scale beyond a flat list by supporting folders, tags, favorites, pins, and richer search. Because the same data needs to render consistently in multiple browsers and survive sync/local fallback behavior, the design needs a stable application store and browser abstraction layer from the start.

## Goals / Non-Goals

**Goals:**
- Build a cross-browser WebExtension with a shared popup experience and consistent storage behavior.
- Model entries, folders, tags, favorites, and pinned state in a normalized store that can be serialized into browser extension storage.
- Capture and persist friendly metadata for saved links, including title, description, hostname, timestamps, and favicon URL.
- Support text search, tag search, and domain search without requiring a remote backend.
- Provide manageable CRUD flows for folders and tags inside the popup UI.
- Keep the user experience fast enough for a popup-sized app and robust enough for import/export.

**Non-Goals:**
- Building a hosted cloud service or proprietary backend outside browser storage.
- Crawling full page content or indexing article text remotely.
- Implementing collaborative/shared lists in the first version.
- Reproducing the original extension's code structure, assets, or styling.

## Decisions

### Use a plain WebExtension architecture with static assets and no bundler

The extension will be implemented as HTML, CSS, and ES modules loaded directly by the extension manifest. This keeps the codebase inspectable, easy to package for multiple browsers, and easier to audit for legal separation from the referenced project.

Alternatives considered:
- Rebuilding with a frontend framework: rejected because the popup is modest in scope and framework/tooling overhead is unnecessary.
- Copying the original build chain: rejected both for maintainability and to avoid converging on the source implementation too closely.

### Use Manifest V3 with a compatibility-oriented browser API wrapper

The extension will use a shared helper that resolves `browser.*` when available and falls back to `chrome.*`. Storage, tabs, context menus, and action behavior will route through this helper so the same code runs in Chromium and Firefox with minimal branching.

Alternatives considered:
- Separate browser-specific codebases: rejected due to duplication and higher verification cost.
- Manifest V2: rejected because Chromium support is effectively centered on MV3.

### Store the library as a single structured document in synced extension storage

Instead of saving each URL as a top-level storage key, the new extension will persist a single `readingListData` object with nested collections:
- `entriesById`
- `entryOrder`
- `foldersById`
- `folderOrder`
- `tagsById`
- `settings`

Each entry will contain:
- `id`
- `url`
- `title`
- `description`
- `domain`
- `faviconUrl`
- `folderId`
- `tagIds`
- `favorite`
- `pinned`
- `read`
- `createdAt`
- `updatedAt`

This keeps migrations and export/import predictable, makes renames safe, and simplifies cross-feature filtering.

Alternatives considered:
- URL-as-key storage: rejected because folder assignment, tags, pinning, and migration logic become awkward.
- IndexedDB: rejected because browser sync support is less direct and the data volume is moderate.

### Capture metadata at save time using local browser APIs and page parsing

The background/service worker will save the current tab or clicked link and attempt to capture title plus available metadata such as description and favicon. For the current active tab, the extension can use tab metadata and a lightweight content-script query when needed. For context-menu link saves where page metadata is unavailable, the extension will fall back to hostname-derived labels and later allow manual editing.

Alternatives considered:
- Remote metadata service: rejected because it adds privacy and reliability risks.
- Storing only raw URLs: rejected because the requested UX explicitly needs readable entries.

### Center the popup on a two-pane layout with folders on the left

The popup will use a fixed left sidebar for folders and saved-filter shortcuts, with the main pane handling search, quick filters, tags, sorting, and the result list. This directly satisfies the folder-placement requirement and gives the extension a stronger organizing metaphor than a flat list.

Alternatives considered:
- Folder modal only: rejected because it hides the primary organizational structure.
- Top tabs instead of sidebar: rejected because it does not scale cleanly with multiple folders.

## Risks / Trade-offs

- [Storage size limits in synced storage] → Keep metadata compact, support manual export/import, and degrade gracefully if sync quotas are reached.
- [Manifest V3 feature differences across browsers] → Centralize browser API access behind helpers and test popup/background flows in Chromium and Firefox.
- [Popup space is limited] → Use a disciplined two-pane layout, collapsible editors, and inline chips instead of large dialog-heavy flows.
- [Metadata capture for arbitrary links can be incomplete] → Fall back to domain/title heuristics and allow users to edit entry titles, folders, and tags after save.
- [More stateful features increase complexity] → Use normalized state plus pure reducer-style helpers to keep mutations predictable.

## Migration Plan

1. Create a fresh extension codebase in this repository with manifest, popup, options/import-export, and background files.
2. Implement the shared storage schema and data helpers.
3. Build the popup UI, CRUD flows, and search/filter behavior against the shared store.
4. Validate the extension in Chromium and Firefox.
5. If users want migration from the referenced extension later, add an import path from its exported JSON rather than trying to reuse its storage layout directly.

Rollback is straightforward because the extension is a new product in a new repository: disable/remove the extension package and preserve exported JSON backups when testing.

## Open Questions

- Whether Firefox-specific manifest adjustments will be needed after the first packaging pass.
- How aggressive the extension should be about injecting a content script for metadata capture on save versus relying primarily on tab metadata.
- Whether drag-and-drop ordering for folders and entries should be included in the first public release or deferred to a later change.
