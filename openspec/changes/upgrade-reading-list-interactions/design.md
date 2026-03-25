## Context

The current codebase already has a working popup-driven reading list with folders, entry editing, inline tag management, search, and cross-browser packaging. The requested change is not a rewrite; it is an interaction pass across the popup, storage helpers, and build outputs to make the product feel complete in real use.

The highest-impact gaps are clustered in one place: the popup. Language is hard-coded, entries cannot be moved by dragging, the saved URL is not editable, tag management is split between inline chips and a lightweight panel, and clickable saved links do not yet behave like a first-class browse action. There is also a Firefox-facing packaging issue: the release output still emits a warning because the Firefox manifest ends up with a `background.scripts` shape that conflicts with the declared manifest version.

## Goals / Non-Goals

**Goals:**
- Introduce a small localization layer that supports Russian and English strings and persists the selected language.
- Add drag-and-drop folder reassignment from entry cards to the folder list with visible hover/drop affordances.
- Provide a dedicated tag-management interface that supports delete flows cleanly alongside existing create and rename behavior.
- Expand entry editing to include URL editing with validation and normalized metadata refresh.
- Make entry links in the main list visually obvious and open them in a new browser window from the popup.
- Produce Chromium and Firefox build outputs that do not emit the current background-manifest warning.

**Non-Goals:**
- Adding more languages than Russian and English in this change.
- Replacing the normalized storage model or introducing a remote backend.
- Building a large i18n framework or external translation dependency.
- Reworking the full popup information architecture beyond what is needed for these interactions.

## Decisions

### Use an internal string dictionary with a persisted `language` setting

The popup and options flows will read user-facing text from a local dictionary keyed by string IDs. The selected language will live in extension settings inside the existing library document so the popup can render consistently without adding a second preference store.

Alternatives considered:
- Hard-coded parallel HTML variants: rejected because it would duplicate markup and drift quickly.
- External i18n tooling or browser `_locales` migration in this pass: rejected because the extension already renders most text from JavaScript and needs a faster incremental path.

### Model drag-and-drop as popup-only transient state with folder drop targets

Dragging an entry will set a transient `draggingEntryId` in popup state and mark hovered folders through CSS classes. On drop, the popup will call the existing update path to change `folderId`, then re-render and clear drag state. This keeps the behavior local to the popup and avoids changing background scripts.

Alternatives considered:
- Native HTML drag-and-drop without explicit popup state: rejected because visual feedback and cleanup become brittle.
- A separate move dialog: rejected because the request explicitly wants direct drag to folders.

### Expand the entry editor instead of creating a second edit surface

The existing entry modal already owns title, description, folder, tags, and flags, so URL editing will be added there with validation. After URL changes, the entry will keep user-edited title/description unless replacement metadata is explicitly derivable and non-empty from the new URL context.

Alternatives considered:
- Editing URLs only in an options page: rejected because it breaks the main workflow.
- Automatically overwriting all metadata on URL change: rejected because it can destroy intentional user edits.

### Split tag management into a dedicated panel backed by existing storage helpers

The current popup already has a tag manager area, but this change will treat it as a first-class management surface: discoverable entry point, reliable delete flows, and explicit library-wide editing semantics. Storage helpers remain the source of truth for duplicate prevention and cleanup from entries.

Alternatives considered:
- Only managing tags via entry editor chips: rejected because users need global cleanup and deletion.
- A separate options page for tags: rejected because tags are a popup-centric workflow.

### Build Firefox artifacts from an MV3-safe manifest without incompatible background fields

The build step will emit browser-specific manifests from one source definition: Chromium keeps the MV3 service worker setup, while Firefox receives the MV3-compatible background structure it accepts for this project without injecting deprecated MV2 semantics. Validation will be done against the built Firefox directory to confirm the warning is gone.

Alternatives considered:
- Downgrading Firefox output to MV2: rejected because the extension should stay aligned with the MV3 architecture already in place.
- Keeping one identical manifest for all browsers: rejected because the current warning proves the compatibility assumptions are wrong.

## Risks / Trade-offs

- [Localized strings drift across popup states] → Centralize strings behind one lookup helper and render all dynamic labels through it.
- [Drag-and-drop inside a constrained popup feels fragile] → Keep drop zones large, highlight them clearly, and preserve existing button-based editing as a fallback.
- [URL edits can introduce invalid or duplicate-looking entries] → Validate URL format before save and normalize hostname metadata after updates.
- [Deleting tags can surprise users if entries silently lose classification] → Use the inline confirmation modal with explicit copy that tag removal affects linked entries.
- [Firefox manifest behavior differs from Chromium] → Generate browser-specific build outputs and lint the Firefox bundle as part of verification.

## Migration Plan

1. Add localization primitives and a persisted language setting to the current popup/state layer.
2. Extend the entry editor and storage helpers for URL editing and metadata normalization.
3. Add drag-and-drop wiring between entry cards and folder rows, plus hover/active styling.
4. Refine tag-management entry points and inline delete confirmations.
5. Update build output generation for Firefox-specific background configuration.
6. Rebuild release artifacts, run unit tests and popup verification, then lint the Firefox package.

Rollback remains low-risk: revert the popup/storage/build changes and rebuild the prior artifacts. User data stays in the same normalized store, with the added language field safely ignored by older code if reverted.

## Open Questions

- Whether the language switcher should live in the toolbar or in a compact settings section once more preferences exist.
- Whether opening a saved link in a new browser window should become configurable later for users who prefer new tabs.
