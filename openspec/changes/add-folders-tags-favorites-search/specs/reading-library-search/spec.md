## ADDED Requirements

### Requirement: Users can search saved entries by text
The extension SHALL let users search saved entries by matching against title, description, URL, and domain fields.

#### Scenario: Text query narrows results
- **WHEN** the user enters a free-text query in the search input
- **THEN** the popup SHALL display only entries whose searchable metadata matches the query

### Requirement: Users can search and filter by domain
The extension SHALL let users narrow entries by domain from the popup interface.

#### Scenario: Domain filter matches hostname
- **WHEN** the user enters a domain-focused query or selects a matching domain filter
- **THEN** the extension SHALL show only entries whose normalized hostname matches the requested domain text

### Requirement: Users can filter by tags
The extension SHALL let users filter the current library view by one or more tags.

#### Scenario: Filter entries by a selected tag
- **WHEN** the user selects a tag filter
- **THEN** the popup SHALL show only entries that include the selected tag

#### Scenario: Search available tags
- **WHEN** the user searches within the tag-management or tag-filter interface
- **THEN** the extension SHALL narrow the visible tags by tag name

### Requirement: Users can combine organizational filters
The extension SHALL combine folder, favorites, pinned, unread, tag, and text/domain search criteria in one result set.

#### Scenario: Combined filters update results
- **WHEN** the user applies multiple filters at the same time
- **THEN** the extension SHALL show only entries that satisfy every active filter
