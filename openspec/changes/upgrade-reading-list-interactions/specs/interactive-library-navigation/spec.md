## ADDED Requirements

### Requirement: Saved links are direct primary actions
The system SHALL make saved links in the main list directly clickable and visually identifiable as interactive items.

#### Scenario: Open a saved link from the main list
- **WHEN** the user clicks a saved link title in the main list
- **THEN** the extension SHALL open the saved URL in a new browser window

#### Scenario: Highlight entry hover state
- **WHEN** the pointer hovers over a saved link card or title in the main list
- **THEN** the system SHALL show a visible hover treatment that distinguishes the interactive entry from non-hovered entries

### Requirement: Entries can be moved by drag and drop into folders
The system SHALL allow the user to drag a saved entry from the main list and drop it onto a folder in the left sidebar to reassign the entry to that folder.

#### Scenario: Move an entry into another folder
- **WHEN** the user drags an entry card and drops it on a folder in the sidebar
- **THEN** the entry SHALL be reassigned to the target folder and the list SHALL refresh to reflect the new location

#### Scenario: Show folder drop feedback
- **WHEN** the user drags an entry over a valid folder target
- **THEN** the target folder SHALL display a clear active highlight until the drag leaves or completes
