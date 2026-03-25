import {
  APP_VERSION,
  DEFAULT_LANGUAGE,
  DEFAULT_FOLDER_ID,
  STORAGE_KEY,
  STORAGE_META_KEY
} from './constants.js';
import { callChromeMethod, extensionApi } from './browser-api.js';
import { normalizeLanguage } from './i18n.js';

let resolvedArea = null;

export const MAX_TAG_NAME_LENGTH = 20;
export const MAX_FOLDER_NAME_LENGTH = 24;

function now() {
  return new Date().toISOString();
}

export function createId(prefix) {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

export function normalizeText(value) {
  return (value ?? '').trim();
}

export function createDefaultLibrary() {
  const timestamp = now();
  return {
    version: APP_VERSION,
    lastUpdatedAt: timestamp,
    foldersById: {
      [DEFAULT_FOLDER_ID]: {
        id: DEFAULT_FOLDER_ID,
        name: 'Inbox',
        createdAt: timestamp,
        updatedAt: timestamp,
        system: true
      }
    },
    folderOrder: [DEFAULT_FOLDER_ID],
    tagsById: {},
    tagOrder: [],
    entriesById: {},
    entryOrder: [],
    settings: {
      selectedFolderId: DEFAULT_FOLDER_ID,
      activeView: 'all',
      language: DEFAULT_LANGUAGE
    }
  };
}

function cloneLibrary(library) {
  return JSON.parse(JSON.stringify(library));
}

function ensureFolder(library, folderId = DEFAULT_FOLDER_ID) {
  if (!library.foldersById[folderId]) {
    library.foldersById[DEFAULT_FOLDER_ID] = library.foldersById[DEFAULT_FOLDER_ID] ?? createDefaultLibrary().foldersById[DEFAULT_FOLDER_ID];
    if (!library.folderOrder.includes(DEFAULT_FOLDER_ID)) {
      library.folderOrder.unshift(DEFAULT_FOLDER_ID);
    }
    return DEFAULT_FOLDER_ID;
  }

  return folderId;
}

function normalizeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
}

export function isValidEntryUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function ensureValidEntryUrl(url) {
  if (!normalizeText(url)) {
    throw new Error('URL is required to save an entry.');
  }
  if (!isValidEntryUrl(url)) {
    throw new Error('Enter a valid URL.');
  }
}

function fallbackDescription(url) {
  const domain = normalizeDomain(url);
  return domain ? `Saved from ${domain}` : 'Saved link';
}

function fallbackTitle(url) {
  const domain = normalizeDomain(url);
  return domain ? `Saved from ${domain}` : url;
}

function sanitizeEntry(input, library) {
  const timestamp = now();
  const existingEntry = input.id && library.entriesById[input.id] ? library.entriesById[input.id] : null;
  const url = normalizeText(input.url || existingEntry?.url || '');
  const urlChanged = Boolean(existingEntry && url && url !== existingEntry.url);
  const title = normalizeText(input.title || existingEntry?.title || fallbackTitle(url));
  const description = normalizeText(input.description || existingEntry?.description || fallbackDescription(url));
  const folderId = ensureFolder(library, input.folderId || existingEntry?.folderId || DEFAULT_FOLDER_ID);
  const tagIds = Array.from(new Set((input.tagIds || existingEntry?.tagIds || []).filter(tagId => library.tagsById[tagId]))).sort();
  const faviconSeed = Object.prototype.hasOwnProperty.call(input, 'faviconUrl')
    ? input.faviconUrl
    : urlChanged
      ? ''
      : existingEntry?.faviconUrl;
  const faviconUrl = normalizeText(faviconSeed || '');

  return {
    id: input.id || existingEntry?.id || createId('entry'),
    url,
    title,
    description,
    domain: normalizeDomain(url),
    faviconUrl: faviconUrl || buildFaviconUrl(url),
    folderId,
    tagIds,
    favorite: Boolean(input.favorite ?? existingEntry?.favorite ?? false),
    pinned: Boolean(input.pinned ?? existingEntry?.pinned ?? false),
    read: Boolean(input.read ?? existingEntry?.read ?? false),
    createdAt: existingEntry?.createdAt || timestamp,
    updatedAt: timestamp
  };
}

export function buildFaviconUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
  } catch (error) {
    return '';
  }
}

function sanitizeTagName(name) {
  return normalizeText(name).replace(/\s+/g, ' ').slice(0, MAX_TAG_NAME_LENGTH);
}

function sanitizeFolderName(name) {
  return normalizeText(name).replace(/\s+/g, ' ').slice(0, MAX_FOLDER_NAME_LENGTH);
}

function folderNameExists(library, name, excludeFolderId = null) {
  const normalized = sanitizeFolderName(name).toLowerCase();
  if (!normalized) {
    return false;
  }

  return Object.values(library.foldersById).some(folder => {
    if (!folder || folder.id === excludeFolderId) {
      return false;
    }
    return sanitizeFolderName(folder.name).toLowerCase() === normalized;
  });
}

function tagNameExists(library, name, excludeTagId = null) {
  const normalized = sanitizeTagName(name).toLowerCase();
  if (!normalized) {
    return false;
  }

  return Object.values(library.tagsById).some(tag => {
    if (!tag || tag.id === excludeTagId) {
      return false;
    }
    return sanitizeTagName(tag.name).toLowerCase() === normalized;
  });
}

export function normalizeLibrary(source) {
  const base = createDefaultLibrary();
  const incoming = source ? cloneLibrary(source) : base;
  const library = {
    version: APP_VERSION,
    lastUpdatedAt: incoming.lastUpdatedAt || now(),
    foldersById: { ...base.foldersById, ...(incoming.foldersById || {}) },
    folderOrder: Array.isArray(incoming.folderOrder) ? [...incoming.folderOrder] : [...base.folderOrder],
    tagsById: incoming.tagsById || {},
    tagOrder: Array.isArray(incoming.tagOrder) ? [...incoming.tagOrder] : [],
    entriesById: incoming.entriesById || {},
    entryOrder: Array.isArray(incoming.entryOrder) ? [...incoming.entryOrder] : [],
    settings: {
      ...base.settings,
      ...(incoming.settings || {})
    }
  };

  library.foldersById[DEFAULT_FOLDER_ID] = library.foldersById[DEFAULT_FOLDER_ID] || base.foldersById[DEFAULT_FOLDER_ID];
  if (!library.folderOrder.includes(DEFAULT_FOLDER_ID)) {
    library.folderOrder.unshift(DEFAULT_FOLDER_ID);
  }

  library.folderOrder = library.folderOrder.filter(folderId => library.foldersById[folderId]);
  Object.values(library.foldersById).forEach(folder => {
    folder.name = sanitizeFolderName(folder.name) || 'Untitled folder';
  });

  library.tagOrder = library.tagOrder.filter(tagId => library.tagsById[tagId]);
  Object.values(library.tagsById).forEach(tag => {
    tag.name = sanitizeTagName(tag.name) || 'untagged';
  });

  const sanitizedEntries = {};
  const sanitizedOrder = [];

  library.entryOrder.forEach(entryId => {
    const entry = library.entriesById[entryId];
    if (!entry) {
      return;
    }
    const sanitizedEntry = sanitizeEntry(entry, library);
    if (!sanitizedEntry.url) {
      return;
    }
    sanitizedEntries[sanitizedEntry.id] = sanitizedEntry;
    sanitizedOrder.push(sanitizedEntry.id);
  });

  Object.values(library.entriesById).forEach(entry => {
    if (sanitizedEntries[entry.id]) {
      return;
    }
    const sanitizedEntry = sanitizeEntry(entry, library);
    if (!sanitizedEntry.url) {
      return;
    }
    sanitizedEntries[sanitizedEntry.id] = sanitizedEntry;
    sanitizedOrder.push(sanitizedEntry.id);
  });

  library.entriesById = sanitizedEntries;
  library.entryOrder = sanitizedOrder;
  library.settings.selectedFolderId = ensureFolder(library, library.settings.selectedFolderId);
  library.settings.language = normalizeLanguage(library.settings.language);

  return library;
}

async function getFromArea(area, key) {
  return callChromeMethod(area, 'get', key);
}

async function setInArea(area, value) {
  return callChromeMethod(area, 'set', value);
}

async function removeFromArea(area, key) {
  return callChromeMethod(area, 'remove', key);
}

async function resolveStorageArea() {
  if (resolvedArea) {
    return resolvedArea;
  }

  try {
    await setInArea(extensionApi.storage.sync, { [STORAGE_META_KEY]: { area: 'sync', checkedAt: now() } });
    resolvedArea = extensionApi.storage.sync;
    return resolvedArea;
  } catch (error) {
    resolvedArea = extensionApi.storage.local;
    return resolvedArea;
  }
}

export async function getStorageAreaName() {
  const area = await resolveStorageArea();
  return area === extensionApi.storage.sync ? 'sync' : 'local';
}

export async function loadLibrary() {
  const syncData = await getFromArea(extensionApi.storage.sync, STORAGE_KEY).catch(() => ({}));
  const localData = await getFromArea(extensionApi.storage.local, STORAGE_KEY).catch(() => ({}));
  const syncLibrary = syncData?.[STORAGE_KEY] ? normalizeLibrary(syncData[STORAGE_KEY]) : null;
  const localLibrary = localData?.[STORAGE_KEY] ? normalizeLibrary(localData[STORAGE_KEY]) : null;

  if (syncLibrary || localLibrary) {
    const syncTime = syncLibrary ? Date.parse(syncLibrary.lastUpdatedAt || 0) : 0;
    const localTime = localLibrary ? Date.parse(localLibrary.lastUpdatedAt || 0) : 0;
    if (syncTime >= localTime) {
      resolvedArea = extensionApi.storage.sync;
      return syncLibrary;
    }

    resolvedArea = extensionApi.storage.local;
    return localLibrary;
  }

  const library = createDefaultLibrary();
  await saveLibrary(library);
  return library;
}

export async function saveLibrary(library) {
  const area = await resolveStorageArea();
  const payload = normalizeLibrary(library);
  payload.lastUpdatedAt = now();

  try {
    await setInArea(area, {
      [STORAGE_KEY]: payload,
      [STORAGE_META_KEY]: {
        area: area === extensionApi.storage.sync ? 'sync' : 'local',
        updatedAt: payload.lastUpdatedAt
      }
    });
  } catch (error) {
    resolvedArea = extensionApi.storage.local;
    await setInArea(extensionApi.storage.local, {
      [STORAGE_KEY]: payload,
      [STORAGE_META_KEY]: {
        area: 'local',
        updatedAt: payload.lastUpdatedAt
      }
    });
  }

  return payload;
}

export async function exportLibrary() {
  const library = await loadLibrary();
  return JSON.stringify(library, null, 2);
}

export async function importLibrary(rawText, mode = 'merge') {
  const parsed = normalizeLibrary(JSON.parse(rawText));
  if (mode === 'replace') {
    return saveLibrary(parsed);
  }

  const current = await loadLibrary();
  const merged = normalizeLibrary({
    ...current,
    foldersById: {
      ...current.foldersById,
      ...parsed.foldersById
    },
    folderOrder: Array.from(new Set([...current.folderOrder, ...parsed.folderOrder])),
    tagsById: {
      ...current.tagsById,
      ...parsed.tagsById
    },
    tagOrder: Array.from(new Set([...current.tagOrder, ...parsed.tagOrder])),
    entriesById: {
      ...current.entriesById,
      ...parsed.entriesById
    },
    entryOrder: Array.from(new Set([...parsed.entryOrder, ...current.entryOrder])),
    settings: {
      ...current.settings,
      ...parsed.settings
    }
  });

  return saveLibrary(merged);
}

export async function addEntry(entryInput) {
  const library = await loadLibrary();
  ensureValidEntryUrl(entryInput.url);
  const normalizedEntry = sanitizeEntry(entryInput, library);

  const existingId = findEntryIdByUrl(library, normalizedEntry.url);
  const entryId = existingId || normalizedEntry.id;
  const finalEntry = sanitizeEntry({ ...normalizedEntry, id: entryId }, library);
  library.entriesById[entryId] = finalEntry;
  library.entryOrder = [entryId, ...library.entryOrder.filter(id => id !== entryId)];
  return saveLibrary(library);
}

export async function updateEntry(entryId, updates) {
  const library = await loadLibrary();
  if (!library.entriesById[entryId]) {
    throw new Error('Entry not found.');
  }

  const nextUpdates = { ...updates };
  if (Object.prototype.hasOwnProperty.call(nextUpdates, 'url')) {
    ensureValidEntryUrl(nextUpdates.url);
  }
  if (Array.isArray(updates.tagNames)) {
    nextUpdates.tagIds = buildTagIdsFromNames(library, updates.tagNames);
    delete nextUpdates.tagNames;
  }

  library.entriesById[entryId] = sanitizeEntry({
    ...library.entriesById[entryId],
    ...nextUpdates,
    id: entryId
  }, library);
  return saveLibrary(library);
}

export async function deleteEntry(entryId) {
  const library = await loadLibrary();
  delete library.entriesById[entryId];
  library.entryOrder = library.entryOrder.filter(id => id !== entryId);
  return saveLibrary(library);
}

export async function createFolder(name) {
  const library = await loadLibrary();
  const cleanName = sanitizeFolderName(name);
  if (!cleanName) {
    throw new Error('Folder name cannot be empty.');
  }
  if (folderNameExists(library, cleanName)) {
    throw new Error('Folder name must be unique.');
  }
  const folderId = createId('folder');
  library.foldersById[folderId] = {
    id: folderId,
    name: cleanName,
    createdAt: now(),
    updatedAt: now(),
    system: false
  };
  library.folderOrder.push(folderId);
  return saveLibrary(library);
}

export async function renameFolder(folderId, name) {
  const library = await loadLibrary();
  if (!library.foldersById[folderId] || library.foldersById[folderId].system) {
    throw new Error('Folder cannot be renamed.');
  }
  const cleanName = sanitizeFolderName(name);
  if (!cleanName) {
    throw new Error('Folder name cannot be empty.');
  }
  if (folderNameExists(library, cleanName, folderId)) {
    throw new Error('Folder name must be unique.');
  }
  library.foldersById[folderId].name = cleanName;
  library.foldersById[folderId].updatedAt = now();
  return saveLibrary(library);
}

export async function deleteFolder(folderId) {
  const library = await loadLibrary();
  const folder = library.foldersById[folderId];
  if (!folder || folder.system) {
    throw new Error('Folder cannot be deleted.');
  }

  delete library.foldersById[folderId];
  library.folderOrder = library.folderOrder.filter(id => id !== folderId);
  Object.values(library.entriesById).forEach(entry => {
    if (entry.folderId === folderId) {
      entry.folderId = DEFAULT_FOLDER_ID;
      entry.updatedAt = now();
    }
  });
  if (library.settings.selectedFolderId === folderId) {
    library.settings.selectedFolderId = DEFAULT_FOLDER_ID;
  }
  return saveLibrary(library);
}

export async function createTag(name) {
  const library = await loadLibrary();
  const cleanName = sanitizeTagName(name);
  if (!cleanName) {
    throw new Error('Tag name cannot be empty.');
  }
  if (tagNameExists(library, cleanName)) {
    throw new Error('Tag name must be unique.');
  }

  const tagId = createId('tag');
  library.tagsById[tagId] = {
    id: tagId,
    name: cleanName,
    createdAt: now(),
    updatedAt: now()
  };
  library.tagOrder.push(tagId);
  return saveLibrary(library);
}

export async function renameTag(tagId, name) {
  const library = await loadLibrary();
  if (!library.tagsById[tagId]) {
    throw new Error('Tag not found.');
  }
  const cleanName = sanitizeTagName(name);
  if (!cleanName) {
    throw new Error('Tag name cannot be empty.');
  }
  if (tagNameExists(library, cleanName, tagId)) {
    throw new Error('Tag name must be unique.');
  }
  library.tagsById[tagId].name = cleanName;
  library.tagsById[tagId].updatedAt = now();
  return saveLibrary(library);
}

export async function deleteTag(tagId) {
  const library = await loadLibrary();
  delete library.tagsById[tagId];
  library.tagOrder = library.tagOrder.filter(id => id !== tagId);
  Object.values(library.entriesById).forEach(entry => {
    entry.tagIds = entry.tagIds.filter(id => id !== tagId);
  });
  return saveLibrary(library);
}

export async function toggleEntryFlag(entryId, flagName) {
  const library = await loadLibrary();
  const entry = library.entriesById[entryId];
  if (!entry || !['favorite', 'pinned', 'read'].includes(flagName)) {
    throw new Error('Entry flag is invalid.');
  }
  entry[flagName] = !entry[flagName];
  entry.updatedAt = now();
  return saveLibrary(library);
}

export async function saveSelectedFolder(folderId) {
  const library = await loadLibrary();
  library.settings.selectedFolderId = ensureFolder(library, folderId);
  return saveLibrary(library);
}

export async function updateSettings(patch) {
  const library = await loadLibrary();
  library.settings = {
    ...library.settings,
    ...patch
  };
  if (Object.prototype.hasOwnProperty.call(library.settings, 'language')) {
    library.settings.language = normalizeLanguage(library.settings.language);
  }
  library.settings.selectedFolderId = ensureFolder(library, library.settings.selectedFolderId);
  return saveLibrary(library);
}

export function buildTagIdsFromNames(library, tagNames) {
  const normalizedNames = tagNames
    .map(tag => sanitizeTagName(tag))
    .filter(Boolean);

  const tagIds = [];
  normalizedNames.forEach(name => {
    let tag = Object.values(library.tagsById).find(item => item.name.toLowerCase() === name.toLowerCase());
    if (!tag) {
      const tagId = createId('tag');
      tag = {
        id: tagId,
        name,
        createdAt: now(),
        updatedAt: now()
      };
      library.tagsById[tagId] = tag;
      library.tagOrder.push(tagId);
    }
    tagIds.push(tag.id);
  });
  return Array.from(new Set(tagIds));
}

export function findEntryIdByUrl(library, url) {
  return library.entryOrder.find(entryId => library.entriesById[entryId]?.url === url) ?? null;
}

export async function removeStorageMeta() {
  await removeFromArea(extensionApi.storage.sync, STORAGE_META_KEY).catch(() => undefined);
  await removeFromArea(extensionApi.storage.local, STORAGE_META_KEY).catch(() => undefined);
}
