# Extension Test Cases

`tests/manual/extension-verify.mjs` covers the release popup, options page, background messaging, and content-script metadata flow against the built Chromium package in `dist/chromium`.

## Covered cases

1. Popup renders a seeded entry with a readable title, description, and domain badge.
2. Folder creation and inline rename update the sidebar correctly.
3. Tag creation, inline rename, and deletion work through the tag manager panel.
4. The tag manager closes cleanly before entry editing and can be closed explicitly from its close button.
5. Entry editing updates folder assignment, tags, favorite state, pinned state, read state, and description.
6. Search filters narrow results by free text, domain, and tag chip selection.
7. Quick views for favorites, pinned, and unread entries show the expected subset.
8. Deleting a folder reassigns its entries back to `Inbox`.
9. Options export and replace import serialize and restore library state correctly.
10. Keyboard shortcuts focus the main search input with `/` and close the entry editor with `Escape`.
11. The content script returns page metadata for a supported page and the background script can retrieve it.

## Recommended verification command

```bash
npm run test:all
```

This runs unit tests, rebuilds the extension packages, and executes the end-to-end Chromium verification flow.
