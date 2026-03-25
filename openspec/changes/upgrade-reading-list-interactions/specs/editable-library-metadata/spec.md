## ADDED Requirements

### Requirement: Users can edit the saved URL
The system SHALL allow users to edit the URL of an existing saved entry from the entry editor.

#### Scenario: Save a valid replacement URL
- **WHEN** the user edits an entry and submits a valid URL
- **THEN** the system SHALL persist the new URL and update the entry's normalized domain metadata

#### Scenario: Reject an invalid replacement URL
- **WHEN** the user edits an entry and submits an invalid URL value
- **THEN** the system SHALL block the save and show an error message without modifying the existing entry

### Requirement: Users can manage tags from a dedicated interface
The system SHALL provide a dedicated tag-management interface where users can review, rename, and delete tags from the library.

#### Scenario: Delete a tag from the tag manager
- **WHEN** the user confirms deletion of a tag in the tag-management interface
- **THEN** the system SHALL remove the tag from the library and from every entry that references it

#### Scenario: Preserve duplicate prevention in tag management
- **WHEN** the user creates or renames a tag to a name that already exists
- **THEN** the system SHALL reject the change and show a uniqueness error
