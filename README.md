# Violet Reading List

Violet Reading List is a cross-browser reading-list extension focused on organization rather than a flat backlog. It saves links with readable metadata and lets users sort the library with folders, tags, favorites, pins, and domain-aware search.

## Features

- Left-side folder navigation in the main popup
- Folder create, rename, and delete flows
- Tag create, rename, delete, assignment, and tag filtering
- Search across title, description, URL, and domain
- Favorites, pinned entries, and unread tracking
- Sync-first extension storage with local fallback
- JSON import/export from the backup page
- Chromium and Firefox-oriented WebExtension structure

## Project Layout

- `manifest.json`: extension manifest
- `popup.html`: main reading-list experience
- `options.html`: import/export and storage status
- `scripts/`: background logic, storage helpers, popup logic, and metadata capture
- `styles/`: popup and options styling
- `assets/icons/`: extension icons

## Load In Browser

### Chromium

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select this repository root

### Firefox

1. Open `about:debugging`
2. Choose `This Firefox`
3. Click `Load Temporary Add-on`
4. Select `manifest.json` from this repository

## Notes

- The extension stores library data in browser-managed extension storage, preferring sync when available.
- The original Chrome Web Store extension that inspired the idea stores links in extension storage via `chrome.storage.sync`; this project intentionally uses a different storage model and implementation.
