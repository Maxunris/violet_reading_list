## ADDED Requirements

### Requirement: Users can organize saved entries with folders
The extension SHALL provide folder creation, renaming, selection, and deletion from the main popup UI, with the folder navigation presented in a left-side sidebar.

#### Scenario: Create a folder from the popup
- **WHEN** the user creates a new folder and enters a readable name
- **THEN** the extension saves the folder, shows it in the left sidebar, and makes it available for assigning entries

#### Scenario: Rename a folder
- **WHEN** the user renames an existing folder
- **THEN** the extension updates the folder label everywhere it is displayed without losing entry assignments

#### Scenario: Delete a folder with assigned entries
- **WHEN** the user deletes a folder that contains entries
- **THEN** the extension removes the folder and reassigns its entries to the default inbox folder

### Requirement: Users can tag entries and manage tags
The extension SHALL let users create, edit, delete, and assign tags to saved entries using readable tag names.

#### Scenario: Add tags to an entry
- **WHEN** the user edits an entry and adds one or more tags
- **THEN** the extension saves those tags and displays them as filters and entry chips

#### Scenario: Rename a tag
- **WHEN** the user renames a tag
- **THEN** every entry referencing that tag SHALL display the updated tag name

#### Scenario: Delete a tag
- **WHEN** the user deletes an existing tag
- **THEN** the extension removes the tag from the catalog and from every entry that used it

### Requirement: Users can mark favorites and pinned entries
The extension SHALL support marking entries as favorites and pinned items independently.

#### Scenario: Favorite an entry
- **WHEN** the user toggles the favorite control for an entry
- **THEN** the entry SHALL be marked as a favorite and become filterable as a favorite item

#### Scenario: Pin an entry
- **WHEN** the user toggles the pinned control for an entry
- **THEN** the entry SHALL stay visually prioritized above non-pinned entries within the current result set

### Requirement: Saved entries show human-friendly metadata
The extension SHALL display saved entries with a human-readable title, readable domain label, favicon, and description when that metadata is available.

#### Scenario: Save the active tab
- **WHEN** the user saves the currently open page
- **THEN** the resulting entry SHALL include the page title and available metadata instead of showing only the raw URL

#### Scenario: Fallback metadata for incomplete saves
- **WHEN** the extension cannot obtain a description or explicit title for a saved URL
- **THEN** it SHALL generate a readable fallback using the hostname and URL information while preserving the original link
