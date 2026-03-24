# Extension Test Cases

`tests/manual/extension-verify.mjs` covers the release popup, options page, background messaging, and content-script metadata flow against the built Chromium package in `dist/chromium`.

## Covered cases

1. Popup renders a seeded entry with a readable title, description, and domain badge.
2. The entry editor modal is hidden on first render.
3. The popup root keeps its fixed extension width instead of collapsing to a narrow viewport.
4. The compact popup layout keeps the `Save Current Tab` action visible without horizontal overflow.
5. The toolbar search toggle opens a secondary search panel, filters entries, and restores the full list after clearing the query.
6. The right pane shows at least four saved links without requiring an initial scroll.
7. The left sidebar scrolls independently from the saved-links pane.
8. The popup always starts in the `Inbox` folder.
9. Folder creation and inline rename update the sidebar correctly.
10. Folder names stay unique on both create and rename flows.
11. Tag creation, inline rename, and deletion work through the tag manager panel.
12. Tag names stay unique on both create and rename flows.
13. The tag manager closes cleanly before entry editing and can be closed explicitly from its close button.
14. Entry editing updates folder assignment, allows adding existing tags and creating new tags, and persists favorite, pinned, read, and description changes.
15. Duplicate tag selection inside the editor is blocked by the UI and duplicate tag creation is blocked by storage validation.
16. Long entry titles still leave the action buttons visible and clickable.
17. Quick views for favorites, pinned, and unread entries show the expected subset.
18. Deleting a folder reassigns its entries back to `Inbox`.
19. Options export and replace import serialize and restore library state correctly.
20. `Escape` closes the entry editor cleanly.
21. The popup toolbar no longer renders the backup action.
22. The entry editor close button hides the modal cleanly.
23. The content script returns page metadata for a supported page and the background script can retrieve it.

## Recommended verification command

```bash
npm run test:all
```

This runs unit tests, rebuilds the extension packages, and executes the end-to-end Chromium verification flow.
