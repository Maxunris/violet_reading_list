# Extension Test Cases

`tests/manual/extension-verify.mjs` covers the release popup, options page, background messaging, and content-script metadata flow against the built Chromium package in `dist/chromium`.

## Covered cases

1. Popup renders a seeded entry with a readable title, description, and domain badge.
2. The entry editor modal is hidden on first render.
3. The popup root keeps its fixed extension width instead of collapsing to a narrow viewport.
4. The compact popup layout keeps the `Save Current Tab` action visible without horizontal overflow.
5. The toolbar search toggle opens a secondary search panel, filters entries, and restores the full list after clearing the query.
6. The popup language switch renders the UI in Russian without reopening the extension.
7. The right pane shows at least four saved links without requiring an initial scroll.
8. The left sidebar scrolls independently from the saved-links pane.
9. The popup always starts in the `Inbox` folder.
10. Saved links show a visible hover treatment and open in a new tab from the main list.
11. Folder creation and inline rename update the sidebar correctly.
12. Folder names stay unique on both create and rename flows.
13. Tag creation, inline rename, and deletion work through the tag manager panel.
14. Tag names stay unique on both create and rename flows.
15. The tag manager closes cleanly before entry editing and can be closed explicitly from its close button.
16. Entry editing updates folder assignment, URL, tags, favorite state, pinned state, read state, and description.
17. Duplicate tag selection inside the editor is blocked by the UI and duplicate tag creation is blocked by storage validation.
18. Deleting a saved link uses an inline confirmation modal and cancellation keeps the entry intact.
19. Long entry titles still leave the action buttons visible and clickable.
20. Entries can be dragged from the main list into a sidebar folder.
21. Quick views for favorites, pinned, and unread entries show the expected subset.
22. Deleting a folder uses the inline confirmation modal and reassigns its entries back to `Inbox`.
23. Options export and replace import serialize and restore library state correctly.
24. `Escape` closes the entry editor cleanly.
25. The popup toolbar no longer renders the backup action.
26. The entry editor close button hides the modal cleanly.
27. The content script returns page metadata for a supported page and the background script can retrieve it.

## Recommended verification command

```bash
npm run test:all
```

This runs unit tests, rebuilds the extension packages, and executes the end-to-end Chromium verification flow.
