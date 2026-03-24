import { DEFAULT_FOLDER_ID, QUICK_VIEWS } from './constants.js';
import {
  createFolder,
  createTag,
  deleteEntry,
  deleteFolder,
  deleteTag,
  loadLibrary,
  renameFolder,
  renameTag,
  saveSelectedFolder,
  toggleEntryFlag,
  updateEntry
} from './storage.js';

const state = {
  library: null,
  folderId: DEFAULT_FOLDER_ID,
  activeView: 'folder',
  query: '',
  searchOpen: false,
  tagLibrarySearch: '',
  tagManagerOpen: false,
  editingEntryId: null,
  editingEntryTagNames: [],
  editingFolderId: null,
  editingTagId: null
};

const elements = {
  folderForm: document.getElementById('folder-form'),
  folderName: document.getElementById('folder-name'),
  folderList: document.getElementById('folder-list'),
  viewList: document.getElementById('view-list'),
  toggleSearch: document.getElementById('toggle-search'),
  searchPanel: document.getElementById('search-panel'),
  searchQuery: document.getElementById('search-query'),
  clearSearch: document.getElementById('clear-search'),
  manageTags: document.getElementById('manage-tags'),
  entryList: document.getElementById('entry-list'),
  emptyState: document.getElementById('empty-state'),
  activeScopeLabel: document.getElementById('active-scope-label'),
  saveCurrent: document.getElementById('save-current'),
  entryTemplate: document.getElementById('entry-template'),
  entryModal: document.getElementById('entry-modal'),
  closeEntryModal: document.getElementById('close-entry-modal'),
  entryForm: document.getElementById('entry-form'),
  entryId: document.getElementById('entry-id'),
  entryTitle: document.getElementById('entry-title'),
  entryDescription: document.getElementById('entry-description'),
  entryFolder: document.getElementById('entry-folder'),
  entryTagSelect: document.getElementById('entry-tag-select'),
  entryAddTag: document.getElementById('entry-add-tag'),
  entryNewTag: document.getElementById('entry-new-tag'),
  entryCreateTag: document.getElementById('entry-create-tag'),
  entrySelectedTags: document.getElementById('entry-selected-tags'),
  entryFavorite: document.getElementById('entry-favorite'),
  entryPinned: document.getElementById('entry-pinned'),
  entryRead: document.getElementById('entry-read'),
  tagManagerPanel: document.getElementById('tag-manager-panel'),
  closeTagPanel: document.getElementById('close-tag-panel'),
  tagForm: document.getElementById('tag-form'),
  tagName: document.getElementById('tag-name'),
  tagLibrarySearch: document.getElementById('tag-library-search'),
  tagLibraryList: document.getElementById('tag-library-list'),
  inlineRenameTemplate: document.getElementById('inline-rename-template'),
  statusStrip: document.getElementById('status-strip')
};

let statusTimer = null;

function getTags(library) {
  return library.tagOrder
    .map(tagId => library.tagsById[tagId])
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getFolders(library) {
  return library.folderOrder
    .map(folderId => library.foldersById[folderId])
    .filter(Boolean);
}

function getEntries(library) {
  return library.entryOrder
    .map(entryId => library.entriesById[entryId])
    .filter(Boolean);
}

function folderLabel(library, folderId) {
  return library.foldersById[folderId]?.name || 'Inbox';
}

function activeScopeText() {
  if (state.activeView !== 'folder') {
    const quickView = QUICK_VIEWS.find(view => view.id === state.activeView);
    return quickView ? quickView.label : 'Saved entries';
  }

  return folderLabel(state.library, state.folderId);
}

function setSelectedFolder(folderId) {
  state.folderId = folderId;
  state.activeView = 'folder';
}

function normalizeTagName(value) {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 32);
}

function resolveCanonicalTagName(rawName) {
  const normalized = normalizeTagName(rawName);
  if (!normalized) {
    return '';
  }

  const existingTag = getTags(state.library).find(tag => tag.name.toLowerCase() === normalized.toLowerCase());
  return existingTag ? existingTag.name : normalized;
}

function hasSelectedTagName(name) {
  return state.editingEntryTagNames.some(tagName => tagName.toLowerCase() === name.toLowerCase());
}

function matchText(haystacks, query) {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();
  return haystacks.some(value => value.toLowerCase().includes(normalized));
}

function getFilteredEntries() {
  const entries = getEntries(state.library);
  const query = state.query.trim().toLowerCase();

  return entries
    .filter(entry => {
      if (state.activeView === 'favorites' && !entry.favorite) {
        return false;
      }
      if (state.activeView === 'pinned' && !entry.pinned) {
        return false;
      }
      if (state.activeView === 'unread' && entry.read) {
        return false;
      }
      if (state.activeView === 'folder' && entry.folderId !== state.folderId) {
        return false;
      }
      if (!matchText([entry.title, entry.description, entry.url, entry.domain], query)) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }
      return new Date(right.updatedAt) - new Date(left.updatedAt);
    });
}

function updateSummary(entries) {
  elements.activeScopeLabel.textContent = activeScopeText();
  elements.emptyState.hidden = entries.length !== 0;
}

function renderViews() {
  elements.viewList.innerHTML = '';
  QUICK_VIEWS.forEach(view => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `view-row sidebar-button${state.activeView === view.id ? ' active' : ''}`;
    const label = document.createElement('span');
    label.textContent = view.label;
    row.appendChild(label);
    row.addEventListener('click', () => {
      state.activeView = view.id;
      render();
    });
    elements.viewList.appendChild(row);
  });
}

function renderFolders() {
  elements.folderList.innerHTML = '';
  getFolders(state.library).forEach(folder => {
    const row = document.createElement('div');
    row.className = `folder-row${state.activeView === 'folder' && state.folderId === folder.id ? ' active' : ''}`;

    if (state.editingFolderId === folder.id) {
      row.classList.add('editing');
      row.appendChild(createInlineRenameForm({
        initialValue: folder.name,
        onSubmit: async nextName => {
          await renameFolder(folder.id, nextName).catch(showError);
          state.editingFolderId = null;
          await syncLibrary();
        },
        onCancel: () => {
          state.editingFolderId = null;
          render();
        }
      }));
      elements.folderList.appendChild(row);
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sidebar-button';
    button.textContent = folder.name;
    button.addEventListener('click', async () => {
      setSelectedFolder(folder.id);
      await saveSelectedFolder(folder.id);
      render();
    });

    const renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.className = 'micro-button';
    renameButton.textContent = '✎';
    renameButton.disabled = folder.system;
    renameButton.addEventListener('click', () => {
      state.editingFolderId = folder.id;
      state.editingTagId = null;
      render();
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'micro-button';
    deleteButton.textContent = '−';
    deleteButton.disabled = folder.system;
    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm(`Delete "${folder.name}"? Its entries will move to Inbox.`);
      if (!confirmed) {
        return;
      }
      await deleteFolder(folder.id).catch(showError);
      await syncLibrary();
    });

    row.append(button, renameButton, deleteButton);
    elements.folderList.appendChild(row);
  });
}

function renderFilterButtons() {
  document.querySelectorAll('[data-toggle-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.toggleFilter === state.activeView);
  });
}

function renderSearchPanel() {
  elements.searchPanel.hidden = !state.searchOpen;
  elements.toggleSearch.classList.toggle('active', state.searchOpen);
}

function renderTagManagerPanel() {
  elements.tagManagerPanel.hidden = !state.tagManagerOpen;
  elements.manageTags.textContent = state.tagManagerOpen ? 'Hide tags' : 'Manage tags';
}

function createBadge(label, className = '') {
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = `badge ${className}`.trim();
  badge.textContent = label;
  return badge;
}

function removeEditingTagName(name) {
  state.editingEntryTagNames = state.editingEntryTagNames.filter(tagName => tagName.toLowerCase() !== name.toLowerCase());
  renderEntryTagEditor();
}

function addEditingTagName(rawName) {
  const canonicalName = resolveCanonicalTagName(rawName);
  if (!canonicalName) {
    return false;
  }
  if (hasSelectedTagName(canonicalName)) {
    showStatus('Tag already selected.', 'error');
    return false;
  }
  state.editingEntryTagNames = [...state.editingEntryTagNames, canonicalName];
  renderEntryTagEditor();
  return true;
}

function renderEntryTagEditor() {
  const selectedTagNames = state.editingEntryTagNames;
  const selectedLookup = new Set(selectedTagNames.map(name => name.toLowerCase()));

  elements.entryTagSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose an existing tag';
  elements.entryTagSelect.appendChild(placeholder);

  getTags(state.library)
    .filter(tag => !selectedLookup.has(tag.name.toLowerCase()))
    .forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.name;
      option.textContent = tag.name;
      elements.entryTagSelect.appendChild(option);
    });

  elements.entrySelectedTags.innerHTML = '';
  selectedTagNames.forEach(tagName => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-chip selected';
    button.textContent = `#${tagName} ×`;
    button.addEventListener('click', () => {
      removeEditingTagName(tagName);
    });
    elements.entrySelectedTags.appendChild(button);
  });
}

function openLink(entry) {
  chrome.tabs.create({ url: entry.url });
  if (!entry.read) {
    toggleEntryFlag(entry.id, 'read').then(syncLibrary).catch(showError);
  }
}

function renderEntries() {
  const entries = getFilteredEntries();
  elements.entryList.innerHTML = '';
  updateSummary(entries);

  entries.forEach(entry => {
    const fragment = elements.entryTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.entry-card');
    const favicon = fragment.querySelector('.entry-favicon');
    const title = fragment.querySelector('.entry-title');
    const description = fragment.querySelector('.entry-description');
    const meta = fragment.querySelector('.entry-meta');
    const tags = fragment.querySelector('.entry-tags');
    const badges = fragment.querySelector('.entry-badges');
    const favoriteButton = fragment.querySelector('.favorite-button');
    const pinButton = fragment.querySelector('.pin-button');
    const readButton = fragment.querySelector('.read-button');
    const editButton = fragment.querySelector('.edit-button');
    const deleteButton = fragment.querySelector('.delete-button');

    card.dataset.entryId = entry.id;
    card.classList.toggle('is-pinned', entry.pinned);
    card.classList.toggle('is-read', entry.read);

    favicon.src = entry.faviconUrl;
    favicon.alt = `${entry.domain} favicon`;
    favicon.onerror = () => {
      favicon.src = 'assets/icons/icon-32.png';
    };

    title.textContent = entry.title;
    title.href = entry.url;
    title.addEventListener('click', event => {
      event.preventDefault();
      openLink(entry);
    });

    description.textContent = entry.description;
    const folderBadge = createBadge(folderLabel(state.library, entry.folderId), 'interactive');
    const domainBadge = createBadge(entry.domain || 'saved link');
    const readBadge = createBadge(entry.read ? 'Read' : 'Unread');

    folderBadge.addEventListener('click', async () => {
      setSelectedFolder(entry.folderId);
      await saveSelectedFolder(entry.folderId);
      render();
    });

    meta.append(folderBadge, domainBadge, readBadge);

    if (entry.favorite) {
      badges.appendChild(createBadge('Favorite', 'favorite'));
    }
    if (entry.pinned) {
      badges.appendChild(createBadge('Pinned', 'pinned'));
    }

    entry.tagIds.forEach(tagId => {
      const tag = state.library.tagsById[tagId];
      if (!tag) {
        return;
      }
      const tagBadge = createBadge(`#${tag.name}`);
      tags.appendChild(tagBadge);
    });

    favoriteButton.classList.toggle('active', entry.favorite);
    pinButton.classList.toggle('active', entry.pinned);
    readButton.classList.toggle('active', entry.read);

    favoriteButton.addEventListener('click', async () => {
      await toggleEntryFlag(entry.id, 'favorite').catch(showError);
      await syncLibrary();
    });
    pinButton.addEventListener('click', async () => {
      await toggleEntryFlag(entry.id, 'pinned').catch(showError);
      await syncLibrary();
    });
    readButton.addEventListener('click', async () => {
      await toggleEntryFlag(entry.id, 'read').catch(showError);
      await syncLibrary();
    });
    editButton.addEventListener('click', () => {
      openEntryEditor(entry.id);
    });
    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm(`Delete "${entry.title}"?`);
      if (!confirmed) {
        return;
      }
      await deleteEntry(entry.id).catch(showError);
      await syncLibrary();
    });

    elements.entryList.appendChild(fragment);
  });
}

function openEntryEditor(entryId) {
  const entry = state.library.entriesById[entryId];
  if (!entry) {
    return;
  }

  closeTagManager();
  state.editingEntryId = entryId;
  elements.entryId.value = entry.id;
  elements.entryTitle.value = entry.title;
  elements.entryDescription.value = entry.description;
  elements.entryFolder.innerHTML = '';
  getFolders(state.library).forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    if (folder.id === entry.folderId) {
      option.selected = true;
    }
    elements.entryFolder.appendChild(option);
  });
  state.editingEntryTagNames = entry.tagIds
    .map(tagId => state.library.tagsById[tagId]?.name)
    .filter(Boolean);
  renderEntryTagEditor();
  elements.entryNewTag.value = '';
  elements.entryFavorite.checked = entry.favorite;
  elements.entryPinned.checked = entry.pinned;
  elements.entryRead.checked = entry.read;
  elements.entryModal.hidden = false;
}

function closeEntryEditor() {
  state.editingEntryId = null;
  state.editingEntryTagNames = [];
  elements.entryNewTag.value = '';
  elements.entryModal.hidden = true;
}

function openTagManager() {
  closeEntryEditor();
  state.tagManagerOpen = true;
  state.editingTagId = null;
  renderTagManagerPanel();
  renderTagLibrary();
}

function closeTagManager() {
  state.tagManagerOpen = false;
  state.editingTagId = null;
  elements.tagName.value = '';
  renderTagManagerPanel();
}

function renderTagLibrary() {
  elements.tagLibraryList.innerHTML = '';
  const query = state.tagLibrarySearch.trim().toLowerCase();
  getTags(state.library)
    .filter(tag => tag.name.toLowerCase().includes(query))
    .forEach(tag => {
      const row = document.createElement('div');
      row.className = 'tag-library-item';

      if (state.editingTagId === tag.id) {
        row.classList.add('editing');
        row.appendChild(createInlineRenameForm({
          initialValue: tag.name,
          onSubmit: async nextName => {
            await renameTag(tag.id, nextName).catch(showError);
            state.editingTagId = null;
            await syncLibrary();
          },
          onCancel: () => {
            state.editingTagId = null;
            renderTagLibrary();
          }
        }));
        elements.tagLibraryList.appendChild(row);
        return;
      }

      const name = document.createElement('span');
      name.textContent = tag.name;

      const renameButton = document.createElement('button');
      renameButton.type = 'button';
      renameButton.className = 'micro-button';
      renameButton.textContent = '✎';
      renameButton.addEventListener('click', () => {
        state.editingTagId = tag.id;
        state.editingFolderId = null;
        renderTagLibrary();
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'micro-button';
      deleteButton.textContent = '−';
      deleteButton.addEventListener('click', async () => {
        const confirmed = window.confirm(`Delete tag "${tag.name}"?`);
        if (!confirmed) {
          return;
        }
        await deleteTag(tag.id).catch(showError);
        await syncLibrary();
      });

      row.append(name, renameButton, deleteButton);
      elements.tagLibraryList.appendChild(row);
    });
}

function render() {
  renderViews();
  renderFolders();
  renderFilterButtons();
  renderSearchPanel();
  renderTagManagerPanel();
  renderEntries();
  renderTagLibrary();
}

function showError(error) {
  if (!error) {
    return;
  }
  showStatus(error.message || String(error), 'error');
}

function showStatus(message, tone = 'info') {
  if (statusTimer) {
    window.clearTimeout(statusTimer);
  }
  elements.statusStrip.textContent = message;
  elements.statusStrip.dataset.tone = tone;
  elements.statusStrip.hidden = false;
  statusTimer = window.setTimeout(() => {
    elements.statusStrip.hidden = true;
  }, 2800);
}

function createInlineRenameForm({ initialValue, onSubmit, onCancel }) {
  const fragment = elements.inlineRenameTemplate.content.cloneNode(true);
  const form = fragment.querySelector('.inline-rename-form');
  const input = fragment.querySelector('.inline-rename-input');
  const cancelButton = fragment.querySelector('.inline-cancel-button');

  input.value = initialValue;
  window.setTimeout(() => {
    input.focus();
    input.select();
  }, 0);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    await onSubmit(input.value);
  });

  cancelButton.addEventListener('click', onCancel);
  return form;
}

async function syncLibrary() {
  state.library = await loadLibrary();
  state.folderId = state.library.foldersById[state.folderId] ? state.folderId : DEFAULT_FOLDER_ID;
  render();
}

async function saveCurrentTab() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'VIOLET_SAVE_ACTIVE_TAB' }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || 'Failed to save current tab.'));
        return;
      }
      resolve(response.library);
    });
  });
}

elements.folderForm.addEventListener('submit', async event => {
  event.preventDefault();
  const created = await createFolder(elements.folderName.value).catch(showError);
  if (!created) {
    return;
  }
  elements.folderName.value = '';
  state.editingFolderId = null;
  await syncLibrary();
  showStatus('Folder created.', 'success');
});

elements.toggleSearch.addEventListener('click', () => {
  state.searchOpen = !state.searchOpen;
  renderSearchPanel();
  if (state.searchOpen) {
    window.setTimeout(() => {
      elements.searchQuery.focus();
      elements.searchQuery.select();
    }, 0);
  }
});

elements.searchQuery.addEventListener('input', event => {
  state.query = event.target.value;
  renderEntries();
});

elements.clearSearch.addEventListener('click', () => {
  state.query = '';
  elements.searchQuery.value = '';
  renderEntries();
});

document.querySelectorAll('[data-toggle-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const nextView = button.dataset.toggleFilter;
    state.activeView = state.activeView === nextView ? 'folder' : nextView;
    render();
  });
});

elements.manageTags.addEventListener('click', () => {
  if (state.tagManagerOpen) {
    closeTagManager();
    return;
  }
  openTagManager();
});

elements.closeTagPanel.addEventListener('click', () => {
  closeTagManager();
});

elements.closeEntryModal.addEventListener('click', closeEntryEditor);

elements.tagForm.addEventListener('submit', async event => {
  event.preventDefault();
  const created = await createTag(elements.tagName.value).catch(showError);
  if (!created) {
    return;
  }
  elements.tagName.value = '';
  state.editingTagId = null;
  await syncLibrary();
  showStatus('Tag created.', 'success');
});

elements.tagLibrarySearch.addEventListener('input', event => {
  state.tagLibrarySearch = event.target.value;
  renderTagLibrary();
});

elements.entryAddTag.addEventListener('click', () => {
  const selectedName = elements.entryTagSelect.value;
  if (!selectedName) {
    return;
  }
  if (addEditingTagName(selectedName)) {
    elements.entryTagSelect.value = '';
  }
});

elements.entryCreateTag.addEventListener('click', () => {
  if (addEditingTagName(elements.entryNewTag.value)) {
    elements.entryNewTag.value = '';
  }
});

elements.entryForm.addEventListener('submit', async event => {
  event.preventDefault();
  const entryId = elements.entryId.value;
  const nextFolderId = elements.entryFolder.value;

  await updateEntry(entryId, {
    title: elements.entryTitle.value,
    description: elements.entryDescription.value,
    folderId: nextFolderId,
    tagNames: state.editingEntryTagNames,
    favorite: elements.entryFavorite.checked,
    pinned: elements.entryPinned.checked,
    read: elements.entryRead.checked
  }).catch(showError);

  if (state.activeView === 'folder' && nextFolderId && nextFolderId !== state.folderId) {
    setSelectedFolder(nextFolderId);
    await saveSelectedFolder(nextFolderId).catch(showError);
  }

  closeEntryEditor();
  await syncLibrary();
  showStatus('Entry updated.', 'success');
});

elements.saveCurrent.addEventListener('click', async () => {
  const saved = await saveCurrentTab().catch(showError);
  if (!saved) {
    return;
  }
  await syncLibrary();
  showStatus('Current tab saved.', 'success');
});

window.addEventListener('click', event => {
  if (event.target === elements.entryModal) {
    closeEntryEditor();
  }
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!elements.entryModal.hidden) {
      closeEntryEditor();
    }
    if (state.tagManagerOpen) {
      closeTagManager();
    }
  }
});

async function init() {
  closeEntryEditor();
  closeTagManager();
  state.library = await loadLibrary();
  state.folderId = DEFAULT_FOLDER_ID;
  state.activeView = 'folder';
  render();
}

init().catch(showError);
