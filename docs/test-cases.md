# Extension Test Cases

`tests/manual/extension-verify.mjs` covers the release popup, options page, background messaging, and content-script metadata flow against the built Chromium package in `dist/chromium`.

## Covered cases

1. Popup renders a seeded entry with a readable title, description, and domain badge.
2. The entry editor modal is hidden on first render.
3. The compact popup layout keeps the `+ Save tab` action visible without horizontal overflow.
4. Folder creation and inline rename update the sidebar correctly.
5. Tag creation, inline rename, and deletion work through the tag manager panel.
6. The tag manager closes cleanly before entry editing and can be closed explicitly from its close button.
7. Entry editing updates folder assignment, tags, favorite state, pinned state, read state, and description.
8. Search filters narrow results by free text, domain, and tag chip selection.
9. Quick views for favorites, pinned, and unread entries show the expected subset.
10. Deleting a folder reassigns its entries back to `Inbox`.
11. Options export and replace import serialize and restore library state correctly.
12. Keyboard shortcuts focus the main search input with `/` and close the entry editor with `Escape`.
13. The entry editor close button hides the modal cleanly.
14. The content script returns page metadata for a supported page and the background script can retrieve it.

## Recommended verification command

```bash
npm run test:all
```

This runs unit tests, rebuilds the extension packages, and executes the end-to-end Chromium verification flow.
