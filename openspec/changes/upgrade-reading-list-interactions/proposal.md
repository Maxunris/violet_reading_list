## Why

The extension already covers basic reading-list management, but several core interactions still feel unfinished: users cannot switch the interface language, move entries directly between folders, edit saved URLs, or manage tags from a dedicated flow. This change closes those gaps now because they directly affect day-to-day usability and browser compatibility, including an active manifest warning in Firefox packaging.

## What Changes

- Add runtime language switching with at least Russian and English UI strings, persisted across popup sessions.
- Add drag-and-drop entry moves from the right-side list into folders in the left sidebar, including clear hover and drop-target feedback.
- Expand tag management into a dedicated interface where users can review, rename, and delete tags without relying only on inline entry editing.
- Allow editing the saved URL itself in the entry editor in addition to title, description, folder, tags, and flags.
- Make saved links feel like primary interactive objects in the main list, with clear hover treatment and direct opening in a new browser window.
- Remove the Firefox manifest warning caused by incompatible background manifest fields while preserving Chromium and Firefox support.

## Capabilities

### New Capabilities
- `localized-library-ui`: Let users switch the extension interface language and keep the preference between sessions.
- `interactive-library-navigation`: Support direct entry opening from the main list and drag-and-drop reassignment into folders with visible drop feedback.
- `editable-library-metadata`: Let users edit saved URLs and manage tag lifecycle from a dedicated tag-management experience.
- `browser-runtime-compatibility`: Package browser-specific background configuration without manifest-version warnings.

### Modified Capabilities

None.

## Impact

- Updates popup rendering, styling, and interaction handling in the main extension UI.
- Extends the library storage/settings model to persist language preference and support safer URL edits.
- Requires drag-and-drop state handling, localized string mapping, and stricter validation around tag and URL updates.
- Requires packaging/build updates so Chromium and Firefox manifests diverge where background configuration rules differ.
