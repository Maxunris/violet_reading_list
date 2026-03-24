## ADDED Requirements

### Requirement: The extension stores data in browser extension storage
The extension SHALL persist saved entries, folders, tags, and settings inside browser-managed extension storage rather than relying on an external service.

#### Scenario: Save data to extension storage
- **WHEN** the user creates, edits, or removes library data
- **THEN** the extension SHALL write the updated library state to browser extension storage

### Requirement: The extension synchronizes when sync storage is available
The extension SHALL prefer synchronized extension storage when the browser supports it and fall back to local extension storage when synchronized storage is unavailable or fails.

#### Scenario: Sync storage is available
- **WHEN** the browser provides synchronized extension storage
- **THEN** the extension SHALL store the library in the synchronized area

#### Scenario: Sync storage is unavailable
- **WHEN** synchronized storage is unavailable or reports an error
- **THEN** the extension SHALL fall back to local storage without preventing the user from using the extension

### Requirement: The extension supports import and export
The extension SHALL allow users to export the stored library to JSON and import a previously exported JSON file.

#### Scenario: Export library data
- **WHEN** the user requests an export
- **THEN** the extension SHALL download a JSON representation of the full library

#### Scenario: Import library data
- **WHEN** the user selects a valid exported library file
- **THEN** the extension SHALL merge or replace the current library according to the chosen import behavior

### Requirement: The extension runs in Chromium-based browsers and Firefox
The extension SHALL use a browser-compatible WebExtension implementation for popup, storage, and save actions.

#### Scenario: Save the active tab from the action popup
- **WHEN** the user opens the popup in a supported browser and saves the active tab
- **THEN** the entry SHALL be created successfully using the same library model across browsers

#### Scenario: Save from the context menu
- **WHEN** the user invokes the extension's context menu on a page or link in a supported browser
- **THEN** the extension SHALL add the corresponding entry to the library
