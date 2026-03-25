import { DEFAULT_FOLDER_ID, QUICK_VIEWS } from './constants.js';
import { extensionApi } from './browser-api.js';
import { getAvailableLanguages, normalizeLanguage, t } from './i18n.js';
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
  updateEntry,
  updateSettings
} from './storage.js';

const state = {
  library: null,
  folderId: DEFAULT_FOLDER_ID,
  activeView: 'folder',
  language: 'en',
  query: '',
  searchOpen: false,
  tagLibrarySearch: '',
  tagManagerOpen: false,
  confirmDialog: null,
  editingEntryId: null,
  editingEntryTagNames: [],
  editingFolderId: null,
  editingTagId: null,
  draggingEntryId: null
};

const elements = {
  folderForm: document.getElementById('folder-form'),
  folderName: document.getElementById('folder-name'),
  folderList: document.getElementById('folder-list'),
  viewList: document.getElementById('view-list'),
  languageSelect: document.getElementById('language-select'),
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
  confirmModal: document.getElementById('confirm-modal'),
  closeConfirmModal: document.getElementById('close-confirm-modal'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  confirmCancel: document.getElementById('confirm-cancel'),
  confirmSubmit: document.getElementById('confirm-submit'),
  entryForm: document.getElementById('entry-form'),
  entryId: document.getElementById('entry-id'),
  entryTitle: document.getElementById('entry-title'),
  entryUrl: document.getElementById('entry-url'),
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

const ERROR_TRANSLATIONS = {
  'Folder name must be unique.': 'errorFolderUnique',
  'Folder name cannot be empty.': 'errorFolderEmpty',
  'Folder cannot be renamed.': 'errorFolderRename',
  'Folder cannot be deleted.': 'errorFolderDelete',
  'Tag name must be unique.': 'errorTagUnique',
  'Tag name cannot be empty.': 'errorTagEmpty',
  'Tag not found.': 'errorTagNotFound',
  'Entry not found.': 'errorEntryNotFound',
  'Entry flag is invalid.': 'errorEntryFlagInvalid',
  'URL is required to save an entry.': 'errorUrlRequired',
  'Enter a valid URL.': 'errorUrlInvalid',
  'Failed to save current tab.': 'errorSaveCurrentTab'
};

let statusTimer = null;
let pendingConfirmAction = null;

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

function folderLabel(folderId) {
  if (folderId === DEFAULT_FOLDER_ID) {
    return t(state.language, 'inboxLabel');
  }
  return state.library.foldersById[folderId]?.name || t(state.language, 'inboxLabel');
}

function activeScopeText() {
  if (state.activeView !== 'folder') {
    const quickView = QUICK_VIEWS.find(view => view.id === state.activeView);
    return quickView ? t(state.language, quickView.labelKey) : t(state.language, 'quickViewAll');
  }

  return folderLabel(state.folderId);
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

function translateErrorMessage(message) {
  const key = ERROR_TRANSLATIONS[message];
  return key ? t(state.language, key) : message;
}

function applyLocalization() {
  document.documentElement.lang = state.language;
  document.title = t(state.language, 'appTitle');

  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(state.language, node.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    node.setAttribute('placeholder', t(state.language, node.dataset.i18nPlaceholder));
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(node => {
    node.setAttribute('aria-label', t(state.language, node.dataset.i18nAriaLabel));
  });

  document.querySelectorAll('[data-toggle-filter]').forEach(button => {
    if (button.dataset.toggleFilter === 'favorites') {
      button.textContent = t(state.language, 'favoritesFilter');
    }
    if (button.dataset.toggleFilter === 'pinned') {
      button.textContent = t(state.language, 'pinnedFilter');
    }
    if (button.dataset.toggleFilter === 'unread') {
      button.textContent = t(state.language, 'unreadFilter');
    }
  });

  renderLanguageControl();
}

function renderLanguageControl() {
  elements.languageSelect.innerHTML = '';
  getAvailableLanguages().forEach(language => {
    const option = document.createElement('option');
    option.value = language.id;
    option.textContent = language.id.toUpperCase();
    if (language.id === state.language) {
      option.selected = true;
    }
    elements.languageSelect.appendChild(option);
  });
  elements.languageSelect.setAttribute('aria-label', t(state.language, 'languageLabel'));
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
    label.textContent = t(state.language, view.labelKey);
    row.appendChild(label);
    row.addEventListener('click', () => {
      state.activeView = view.id;
      render();
    });
    elements.viewList.appendChild(row);
  });
}

function clearFolderDropTargets() {
  document.querySelectorAll('.folder-row.drop-target').forEach(row => row.classList.remove('drop-target'));
}

function clearDraggingState() {
  state.draggingEntryId = null;
  document.body.classList.remove('drag-active');
  document.querySelectorAll('.entry-card.is-dragging').forEach(card => card.classList.remove('is-dragging'));
  clearFolderDropTargets();
}

async function moveEntryToFolder(entryId, targetFolderId) {
  const entry = state.library.entriesById[entryId];
  if (!entry || entry.folderId === targetFolderId) {
    return;
  }

  await updateEntry(entryId, { folderId: targetFolderId });
  await syncLibrary();
  showStatus(t(state.language, 'entryMoved', { name: folderLabel(targetFolderId) }), 'success');
}

function wireFolderDropTarget(row, folder) {
  row.addEventListener('dragover', event => {
    if (!state.draggingEntryId) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    clearFolderDropTargets();
    row.classList.add('drop-target');
  });

  row.addEventListener('dragenter', event => {
    if (!state.draggingEntryId) {
      return;
    }
    event.preventDefault();
    clearFolderDropTargets();
    row.classList.add('drop-target');
  });

  row.addEventListener('dragleave', event => {
    if (!row.contains(event.relatedTarget)) {
      row.classList.remove('drop-target');
    }
  });

  row.addEventListener('drop', async event => {
    if (!state.draggingEntryId) {
      return;
    }
    event.preventDefault();
    const entryId = event.dataTransfer?.getData('text/plain') || state.draggingEntryId;
    clearDraggingState();
    await moveEntryToFolder(entryId, folder.id).catch(showError);
  });
}

function renderFolders() {
  elements.folderList.innerHTML = '';
  getFolders(state.library).forEach(folder => {
    const row = document.createElement('div');
    row.className = `folder-row${state.activeView === 'folder' && state.folderId === folder.id ? ' active' : ''}`;
    row.dataset.folderId = folder.id;
    wireFolderDropTarget(row, folder);

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
    button.textContent = folderLabel(folder.id);
    button.addEventListener('click', async () => {
      setSelectedFolder(folder.id);
      await saveSelectedFolder(folder.id);
      render();
    });

    const renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.className = 'micro-button';
    renameButton.textContent = '✎';
    renameButton.title = t(state.language, 'editEntryTitle');
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
    deleteButton.title = t(state.language, 'deleteFolderButton');
    deleteButton.disabled = folder.system;
    deleteButton.addEventListener('click', () => {
      openConfirmDialog({
        titleKey: 'deleteFolderTitle',
        titleParams: { name: folder.name },
        messageKey: 'deleteFolderMessage',
        confirmLabelKey: 'deleteFolderButton',
        onConfirm: async () => {
          await deleteFolder(folder.id);
          await syncLibrary();
        }
      });
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
  elements.manageTags.textContent = state.tagManagerOpen ? t(state.language, 'cancel') : t(state.language, 'manageTags');
}

function renderConfirmDialog() {
  const dialog = state.confirmDialog;
  elements.confirmModal.hidden = !dialog;

  if (!dialog) {
    elements.confirmTitle.textContent = t(state.language, 'confirmDeleteItem');
    elements.confirmMessage.textContent = '';
    elements.confirmSubmit.textContent = t(state.language, 'delete');
    return;
  }

  elements.confirmTitle.textContent = dialog.titleKey
    ? t(state.language, dialog.titleKey, dialog.titleParams)
    : dialog.title;
  elements.confirmMessage.textContent = dialog.messageKey
    ? t(state.language, dialog.messageKey, dialog.messageParams)
    : dialog.message;
  elements.confirmSubmit.textContent = dialog.confirmLabelKey
    ? t(state.language, dialog.confirmLabelKey, dialog.confirmLabelParams)
    : dialog.confirmLabel;
}

function openConfirmDialog(dialog) {
  pendingConfirmAction = dialog.onConfirm;
  state.confirmDialog = dialog;
  renderConfirmDialog();
}

function closeConfirmDialog() {
  pendingConfirmAction = null;
  state.confirmDialog = null;
  renderConfirmDialog();
}

async function confirmCurrentAction() {
  const action = pendingConfirmAction;
  closeConfirmDialog();
  if (!action) {
    return;
  }
  await action().catch(showError);
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
    showStatus(t(state.language, 'tagAlreadySelected'), 'error');
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
  placeholder.textContent = t(state.language, 'chooseExistingTag');
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

async function openBrowserWindow(url) {
  if (globalThis.browser?.windows?.create) {
    await globalThis.browser.windows.create({ url });
    return;
  }

  await new Promise((resolve, reject) => {
    extensionApi.windows.create({ url }, () => {
      const runtime = globalThis.chrome?.runtime;
      if (runtime?.lastError) {
        reject(new Error(runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function openLink(entry) {
  openBrowserWindow(entry.url).catch(showError);
  if (!entry.read) {
    toggleEntryFlag(entry.id, 'read').then(syncLibrary).catch(showError);
  }
}

function beginEntryDrag(entryId, card, event) {
  state.draggingEntryId = entryId;
  document.body.classList.add('drag-active');
  card.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entryId);
  }
}

function renderEntries() {
  const entries = getFilteredEntries();
  elements.entryList.innerHTML = '';
  updateSummary(entries);

  entries.forEach(entry => {
    const fragment = elements.entryTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.entry-card');
    const main = fragment.querySelector('.entry-main');
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
    card.draggable = true;
    card.classList.toggle('is-pinned', entry.pinned);
    card.classList.toggle('is-read', entry.read);

    card.addEventListener('dragstart', event => {
      beginEntryDrag(entry.id, card, event);
    });
    card.addEventListener('dragend', clearDraggingState);

    favicon.src = entry.faviconUrl;
    favicon.alt = `${entry.domain} favicon`;
    favicon.onerror = () => {
      favicon.src = 'assets/icons/icon-32.png';
    };

    title.textContent = entry.title;
    title.href = entry.url;
    title.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openLink(entry);
    });

    main.addEventListener('click', event => {
      if (event.target.closest('.badge.interactive')) {
        return;
      }
      if (event.target.closest('.entry-title')) {
        return;
      }
      openLink(entry);
    });

    description.textContent = entry.description;
    const folderBadge = createBadge(folderLabel(entry.folderId), 'interactive');
    const domainBadge = createBadge(entry.domain || t(state.language, 'savedLink'));
    const readBadge = createBadge(entry.read ? t(state.language, 'readBadge') : t(state.language, 'unreadBadge'));

    folderBadge.addEventListener('click', async event => {
      event.stopPropagation();
      setSelectedFolder(entry.folderId);
      await saveSelectedFolder(entry.folderId);
      render();
    });

    meta.append(folderBadge, domainBadge, readBadge);

    if (entry.favorite) {
      badges.appendChild(createBadge(t(state.language, 'favoriteBadge'), 'favorite'));
    }
    if (entry.pinned) {
      badges.appendChild(createBadge(t(state.language, 'pinnedBadge'), 'pinned'));
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
    favoriteButton.title = t(state.language, 'toggleFavoriteTitle');
    pinButton.title = t(state.language, 'togglePinnedTitle');
    readButton.title = t(state.language, 'toggleReadTitle');
    editButton.title = t(state.language, 'editEntryTitle');
    deleteButton.title = t(state.language, 'deleteEntryTitle');

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
    deleteButton.addEventListener('click', () => {
      openConfirmDialog({
        titleKey: 'deleteLinkTitle',
        message: entry.title,
        confirmLabelKey: 'deleteLinkButton',
        onConfirm: async () => {
          await deleteEntry(entry.id);
          await syncLibrary();
        }
      });
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
  elements.entryUrl.value = entry.url;
  elements.entryDescription.value = entry.description;
  elements.entryFolder.innerHTML = '';
  getFolders(state.library).forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folderLabel(folder.id);
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
      renameButton.title = t(state.language, 'editEntryTitle');
      renameButton.addEventListener('click', () => {
        state.editingTagId = tag.id;
        state.editingFolderId = null;
        renderTagLibrary();
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'micro-button';
      deleteButton.textContent = '−';
      deleteButton.title = t(state.language, 'deleteTagButton');
      deleteButton.addEventListener('click', () => {
        openConfirmDialog({
          titleKey: 'deleteTagTitle',
          titleParams: { name: tag.name },
          messageKey: 'deleteTagMessage',
          confirmLabelKey: 'deleteTagButton',
          onConfirm: async () => {
            await deleteTag(tag.id);
            await syncLibrary();
          }
        });
      });

      row.append(name, renameButton, deleteButton);
      elements.tagLibraryList.appendChild(row);
    });
}

function render() {
  applyLocalization();
  renderViews();
  renderFolders();
  renderFilterButtons();
  renderSearchPanel();
  renderTagManagerPanel();
  renderConfirmDialog();
  renderEntries();
  renderTagLibrary();
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

function showError(error) {
  if (!error) {
    return;
  }
  showStatus(translateErrorMessage(error.message || String(error)), 'error');
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
  state.language = normalizeLanguage(state.library.settings.language);
  state.folderId = state.library.foldersById[state.folderId] ? state.folderId : DEFAULT_FOLDER_ID;
  render();
}

async function saveCurrentTab() {
  return new Promise((resolve, reject) => {
    extensionApi.runtime.sendMessage({ type: 'VIOLET_SAVE_ACTIVE_TAB' }, response => {
      const runtime = globalThis.chrome?.runtime;
      if (runtime?.lastError) {
        reject(new Error(runtime.lastError.message));
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

async function refreshContextMenus() {
  return new Promise(resolve => {
    extensionApi.runtime.sendMessage({ type: 'VIOLET_REFRESH_CONTEXT_MENUS' }, () => resolve());
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
  showStatus(t(state.language, 'folderCreated'), 'success');
});

elements.languageSelect.addEventListener('change', async event => {
  const nextLanguage = normalizeLanguage(event.target.value);
  state.language = nextLanguage;
  render();
  await updateSettings({ language: nextLanguage }).catch(showError);
  await syncLibrary();
  await refreshContextMenus().catch(() => undefined);
  showStatus(t(state.language, 'languageSaved'), 'success');
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

elements.closeTagPanel.addEventListener('click', closeTagManager);
elements.closeEntryModal.addEventListener('click', closeEntryEditor);
elements.closeConfirmModal.addEventListener('click', closeConfirmDialog);
elements.confirmCancel.addEventListener('click', closeConfirmDialog);
elements.confirmSubmit.addEventListener('click', () => {
  confirmCurrentAction();
});

elements.tagForm.addEventListener('submit', async event => {
  event.preventDefault();
  const created = await createTag(elements.tagName.value).catch(showError);
  if (!created) {
    return;
  }
  elements.tagName.value = '';
  state.editingTagId = null;
  await syncLibrary();
  showStatus(t(state.language, 'tagCreated'), 'success');
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
    url: elements.entryUrl.value,
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
  showStatus(t(state.language, 'entryUpdated'), 'success');
});

elements.saveCurrent.addEventListener('click', async () => {
  const saved = await saveCurrentTab().catch(showError);
  if (!saved) {
    return;
  }
  await syncLibrary();
  showStatus(t(state.language, 'currentTabSaved'), 'success');
});

window.addEventListener('click', event => {
  if (event.target === elements.entryModal) {
    closeEntryEditor();
  }
  if (event.target === elements.confirmModal) {
    closeConfirmDialog();
  }
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!elements.entryModal.hidden) {
      closeEntryEditor();
    }
    if (!elements.confirmModal.hidden) {
      closeConfirmDialog();
    }
    if (state.tagManagerOpen) {
      closeTagManager();
    }
  }
});

async function init() {
  closeEntryEditor();
  closeConfirmDialog();
  closeTagManager();
  state.library = await loadLibrary();
  state.language = normalizeLanguage(state.library.settings.language);
  state.folderId = DEFAULT_FOLDER_ID;
  state.activeView = 'folder';
  render();
}

init().catch(showError);
