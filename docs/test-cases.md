# Extension Test Cases

`tests/manual/extension-verify.mjs` covers the release popup, options page, background messaging, and content-script metadata flow against the built Chromium package in `dist/chromium`.

## Covered cases

1. Popup renders a seeded entry with a readable title, description, and domain badge.
2. The entry editor modal is hidden on first render.
3. The popup root keeps its fixed extension width instead of collapsing to a narrow viewport.
4. The compact popup layout keeps the `Save Current Tab` action visible without horizontal overflow.
5. The right pane shows at least four saved links without requiring an initial scroll.
6. The left sidebar scrolls independently from the saved-links pane.
7. The popup always starts in the `Inbox` folder.
8. Folder creation and inline rename update the sidebar correctly.
9. Folder names stay unique on both create and rename flows.
10. Tag creation, inline rename, and deletion work through the tag manager panel.
11. The tag manager closes cleanly before entry editing and can be closed explicitly from its close button.
12. Entry editing updates folder assignment, tags, favorite state, pinned state, read state, and description.
13. Long entry titles still leave the action buttons visible and clickable.
14. Free-text search narrows and restores results correctly.
15. Quick views for favorites, pinned, and unread entries show the expected subset.
16. Deleting a folder reassigns its entries back to `Inbox`.
17. Options export and replace import serialize and restore library state correctly.
18. Keyboard shortcuts focus the main search input with `/` and close the entry editor with `Escape`.
19. The popup toolbar no longer renders the backup action.
20. The entry editor close button hides the modal cleanly.
21. The content script returns page metadata for a supported page and the background script can retrieve it.

## Recommended verification command

```bash
npm run test:all
```

This runs unit tests, rebuilds the extension packages, and executes the end-to-end Chromium verification flow.
