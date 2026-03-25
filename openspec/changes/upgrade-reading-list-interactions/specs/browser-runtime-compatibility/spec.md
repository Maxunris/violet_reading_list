## ADDED Requirements

### Requirement: Browser-specific build output avoids manifest background warnings
The system SHALL generate release manifests that are valid for their target browser and MUST avoid the known Firefox warning about incompatible background manifest fields.

#### Scenario: Build Firefox release artifact
- **WHEN** the Firefox release package is built and validated
- **THEN** the generated manifest SHALL not emit the `'background.scripts' requires manifest version of 2 or lower` warning

#### Scenario: Preserve Chromium background behavior
- **WHEN** the Chromium release package is built
- **THEN** the generated manifest SHALL continue to provide the background behavior required for save flows, context menus, and popup interactions
