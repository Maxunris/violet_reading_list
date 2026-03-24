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
  domainQuery: '',
  tagSearch: '',
  selectedTagIds: [],
  tagLibrarySearch: '',
  editingEntryId: null,
  editingFolderId: null,
  editingTagId: null
};

const elements = {
  folderForm: document.getElementById('folder-form'),
  folderName: document.getElementById('folder-name'),
  folderList: document.getElementById('folder-list'),
  viewList: document.getElementById('view-list'),
  searchQuery: document.getElementById('search-query'),
  domainQuery: document.getElementById('domain-query'),
  clearFilters: document.getElementById('clear-filters'),
  tagSearch: document.getElementById('tag-search'),
  tagFilterList: document.getElementById('tag-filter-list'),
  manageTags: document.getElementById('manage-tags'),
  entryList: document.getElementById('entry-list'),
  emptyState: document.getElementById('empty-state'),
  entryCount: document.getElementById('entry-count'),
  unreadCount: document.getElementById('unread-count'),
  favoriteCount: document.getElementById('favorite-count'),
  pinnedCount: document.getElementById('pinned-count'),
  activeScopeLabel: document.getElementById('active-scope-label'),
  saveCurrent: document.getElementById('save-current'),
  openOptions: document.getElementById('open-options'),
  entryTemplate: document.getElementById('entry-template'),
  entryModal: document.getElementById('entry-modal'),
  closeEntryModal: document.getElementById('close-entry-modal'),
  entryForm: document.getElementById('entry-form'),
  entryId: document.getElementById('entry-id'),
  entryTitle: document.getElementById('entry-title'),
  entryDescription: document.getElementById('entry-description'),
  entryFolder: document.getElementById('entry-folder'),
  entryTags: document.getElementById('entry-tags'),
  entryFavorite: document.getElementById('entry-favorite'),
  entryPinned: document.getElementById('entry-pinned'),
  entryRead: document.getElementById('entry-read'),
  tagModal: document.getElementById('tag-modal'),
  closeTagModal: document.getElementById('close-tag-modal'),
  tagForm: document.getElementById('tag-form'),
  tagName: document.getElementById('tag-name'),
  tagLibrarySearch: document.getElementById('tag-library-search'),
  tagLibraryList: document.getElementById('tag-library-list'),
  inlineRenameTemplate: document.getElementById('inline-rename-template')
};

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

function escapeTagList(tagNames) {
  return tagNames.join(', ');
}

function parseTagInput(rawValue) {
  return rawValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
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
  const domainQuery = state.domainQuery.trim().toLowerCase();
  const selectedTagIds = state.selectedTagIds;

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
      if (domainQuery && !entry.domain.toLowerCase().includes(domainQuery)) {
        return false;
      }
      if (selectedTagIds.length > 0 && !selectedTagIds.every(tagId => entry.tagIds.includes(tagId))) {
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
  const allEntries = getEntries(state.library);
  elements.entryCount.textContent = `${allEntries.length}`;
  elements.unreadCount.textContent = `${allEntries.filter(entry => !entry.read).length}`;
  elements.favoriteCount.textContent = `${allEntries.filter(entry => entry.favorite).length}`;
  elements.pinnedCount.textContent = `${allEntries.filter(entry => entry.pinned).length}`;
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

function renderTagFilters() {
  elements.tagFilterList.innerHTML = '';
  const search = state.tagSearch.trim().toLowerCase();
  const tags = getTags(state.library).filter(tag => tag.name.toLowerCase().includes(search));

  tags.forEach(tag => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tag-chip${state.selectedTagIds.includes(tag.id) ? ' active' : ''}`;
    button.textContent = tag.name;
    button.addEventListener('click', () => {
      if (state.selectedTagIds.includes(tag.id)) {
        state.selectedTagIds = state.selectedTagIds.filter(id => id !== tag.id);
      } else {
        state.selectedTagIds = [...state.selectedTagIds, tag.id];
      }
      render();
    });
    elements.tagFilterList.appendChild(button);
  });
}

function renderFilterButtons() {
  document.querySelectorAll('[data-toggle-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.toggleFilter === state.activeView);
  });
}

function createBadge(label, className = '') {
  const badge = document.createElement('span');
  badge.className = `badge ${className}`.trim();
  badge.textContent = label;
  return badge;
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
    meta.append(
      createBadge(folderLabel(state.library, entry.folderId)),
      createBadge(entry.domain || 'saved link'),
      createBadge(entry.read ? 'Read' : 'Unread')
    );

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
      tags.appendChild(createBadge(`#${tag.name}`));
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
  elements.entryTags.value = escapeTagList(entry.tagIds.map(tagId => state.library.tagsById[tagId]?.name).filter(Boolean));
  elements.entryFavorite.checked = entry.favorite;
  elements.entryPinned.checked = entry.pinned;
  elements.entryRead.checked = entry.read;
  elements.entryModal.hidden = false;
}

function closeEntryEditor() {
  state.editingEntryId = null;
  elements.entryModal.hidden = true;
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
  renderTagFilters();
  renderEntries();
  renderTagLibrary();
}

function showError(error) {
  if (!error) {
    return;
  }
  window.alert(error.message || String(error));
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
  state.folderId = state.library.settings.selectedFolderId || state.folderId;
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
  await createFolder(elements.folderName.value).catch(showError);
  elements.folderName.value = '';
  state.editingFolderId = null;
  await syncLibrary();
});

elements.searchQuery.addEventListener('input', event => {
  state.query = event.target.value;
  render();
});

elements.domainQuery.addEventListener('input', event => {
  state.domainQuery = event.target.value;
  render();
});

elements.tagSearch.addEventListener('input', event => {
  state.tagSearch = event.target.value;
  renderTagFilters();
});

elements.clearFilters.addEventListener('click', () => {
  state.query = '';
  state.domainQuery = '';
  state.tagSearch = '';
  state.selectedTagIds = [];
  state.activeView = 'folder';
  elements.searchQuery.value = '';
  elements.domainQuery.value = '';
  elements.tagSearch.value = '';
  render();
});

document.querySelectorAll('[data-toggle-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const nextView = button.dataset.toggleFilter;
    state.activeView = state.activeView === nextView ? 'folder' : nextView;
    render();
  });
});

elements.manageTags.addEventListener('click', () => {
  elements.tagModal.hidden = false;
});

elements.closeTagModal.addEventListener('click', () => {
  elements.tagModal.hidden = true;
});

elements.closeEntryModal.addEventListener('click', closeEntryEditor);

elements.tagForm.addEventListener('submit', async event => {
  event.preventDefault();
  await createTag(elements.tagName.value).catch(showError);
  elements.tagName.value = '';
  state.editingTagId = null;
  await syncLibrary();
});

elements.tagLibrarySearch.addEventListener('input', event => {
  state.tagLibrarySearch = event.target.value;
  renderTagLibrary();
});

elements.entryForm.addEventListener('submit', async event => {
  event.preventDefault();
  const entryId = elements.entryId.value;

  await updateEntry(entryId, {
    title: elements.entryTitle.value,
    description: elements.entryDescription.value,
    folderId: elements.entryFolder.value,
    tagNames: parseTagInput(elements.entryTags.value),
    favorite: elements.entryFavorite.checked,
    pinned: elements.entryPinned.checked,
    read: elements.entryRead.checked
  }).catch(showError);

  closeEntryEditor();
  await syncLibrary();
});

elements.saveCurrent.addEventListener('click', async () => {
  await saveCurrentTab().catch(showError);
  await syncLibrary();
});

elements.openOptions.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

window.addEventListener('click', event => {
  if (event.target === elements.entryModal) {
    closeEntryEditor();
  }
  if (event.target === elements.tagModal) {
    elements.tagModal.hidden = true;
  }
});

async function init() {
  state.library = await loadLibrary();
  state.folderId = state.library.settings.selectedFolderId || DEFAULT_FOLDER_ID;
  state.activeView = 'folder';
  render();
}

init().catch(showError);
