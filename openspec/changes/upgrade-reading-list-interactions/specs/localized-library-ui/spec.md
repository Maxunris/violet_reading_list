## ADDED Requirements

### Requirement: User can switch the extension language
The system SHALL let the user switch the extension interface language between English and Russian from the popup UI, and the selected language MUST persist across popup sessions.

#### Scenario: Change language from the popup
- **WHEN** the user selects Russian or English in the popup language control
- **THEN** visible popup labels, actions, empty states, confirmation text, and management panels SHALL re-render in the selected language without reloading the extension

#### Scenario: Restore previously selected language
- **WHEN** the user closes and reopens the popup after changing the language
- **THEN** the popup SHALL render in the last selected language stored in extension settings
