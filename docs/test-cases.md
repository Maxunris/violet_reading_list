# Extension Test Cases

`tests/manual/extension-verify.mjs` covers the release popup, options page, background messaging, and content-script metadata flow against the built Chromium package in `dist/chromium`.

## Covered cases

1. Popup renders a seeded entry with a readable title, description, and domain badge.
2. The entry editor modal is hidden on first render.
3. The popup root keeps its fixed extension width instead of collapsing to a narrow viewport.
4. The compact popup layout keeps the `+ Save tab` action visible without horizontal overflow.
5. Folder creation and inline rename update the sidebar correctly.
6. Tag creation, inline rename, and deletion work through the tag manager panel.
7. The tag manager closes cleanly before entry editing and can be closed explicitly from its close button.
8. Entry editing updates folder assignment, tags, favorite state, pinned state, read state, and description.
9. Search filters narrow results by free text, domain, and tag chip selection.
10. Quick views for favorites, pinned, and unread entries show the expected subset.
11. Deleting a folder reassigns its entries back to `Inbox`.
12. Options export and replace import serialize and restore library state correctly.
13. Keyboard shortcuts focus the main search input with `/` and close the entry editor with `Escape`.
14. The entry editor close button hides the modal cleanly.
15. The content script returns page metadata for a supported page and the background script can retrieve it.

## Recommended verification command

```bash
npm run test:all
```

This runs unit tests, rebuilds the extension packages, and executes the end-to-end Chromium verification flow.
