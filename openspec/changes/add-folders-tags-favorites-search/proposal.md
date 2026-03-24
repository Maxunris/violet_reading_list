## Why

The current extension pattern is useful for saving links quickly, but it breaks down once a user accumulates dozens of entries and needs real organization. This change creates a distinct, legally safe reading-list extension with stronger information architecture, richer metadata, and a more polished browser UI that works across Chromium-based browsers and Firefox.

## What Changes

- Build a new browser extension from scratch that preserves the core "save for later" workflow without copying the referenced extension's implementation.
- Add folder management with a persistent left-side navigation pane in the main popup UI.
- Add tag creation, editing, deletion, assignment, and filtering for saved entries.
- Add richer search and filtering, including text search, domain search, and tag-based search.
- Add favorites and pinned items as first-class saved-entry attributes.
- Store and display human-friendly metadata for entries, including title, description, hostname, and favicon when available.
- Support import/export and browser storage synchronization with a cross-browser WebExtension architecture.
- Refresh the visual design with a more intentional purple-forward interface.

## Capabilities

### New Capabilities
- `reading-library-organization`: Manage saved links with folders, tags, pinned items, and favorites in a structured library UI.
- `reading-library-search`: Discover saved links through text, tag, and domain search with composable filters.
- `cross-browser-reading-extension`: Package and persist the reading list as a cross-browser WebExtension with synchronized storage, import/export, and rich metadata capture.

### Modified Capabilities

None.

## Impact

- Adds a full extension codebase, including manifest, popup UI, background/service worker, shared storage helpers, and import/export flows.
- Introduces a normalized storage model for entries, folders, tags, settings, and ordering metadata.
- Requires browser-compatible APIs for storage, tabs, context menus, and action popup behavior.
- Requires manual browser validation for Chromium and Firefox packaging/runtime differences.
