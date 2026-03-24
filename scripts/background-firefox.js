const FIREFOX_STORAGE_KEY = 'readingListData';
const FIREFOX_DEFAULT_FOLDER_ID = 'folder_inbox';
const FIREFOX_PAGE_MENU_ID = 'violet-save-page';
const FIREFOX_LINK_MENU_ID = 'violet-save-link';

function firefoxNow() {
  return new Date().toISOString();
}

function firefoxCreateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function firefoxCreateDefaultLibrary() {
  const timestamp = firefoxNow();
  return {
    version: 1,
    lastUpdatedAt: timestamp,
    foldersById: {
      [FIREFOX_DEFAULT_FOLDER_ID]: {
        id: FIREFOX_DEFAULT_FOLDER_ID,
        name: 'Inbox',
        createdAt: timestamp,
        updatedAt: timestamp,
        system: true
      }
    },
    folderOrder: [FIREFOX_DEFAULT_FOLDER_ID],
    tagsById: {},
    tagOrder: [],
    entriesById: {},
    entryOrder: [],
    settings: {
      selectedFolderId: FIREFOX_DEFAULT_FOLDER_ID,
      activeView: 'folder'
    }
  };
}

function firefoxNormalizeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
}

function firefoxBuildFaviconUrl(url) {
  try {
    return `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`;
  } catch (error) {
    return '';
  }
}

function firefoxCall(area, method, value) {
  return new Promise((resolve, reject) => {
    area[method](value, result => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
}

function firefoxNormalizeLibrary(source) {
  const base = firefoxCreateDefaultLibrary();
  const library = source || base;
  library.foldersById = library.foldersById || base.foldersById;
  library.folderOrder = Array.isArray(library.folderOrder) ? library.folderOrder : base.folderOrder;
  library.tagsById = library.tagsById || {};
  library.tagOrder = Array.isArray(library.tagOrder) ? library.tagOrder : [];
  library.entriesById = library.entriesById || {};
  library.entryOrder = Array.isArray(library.entryOrder) ? library.entryOrder : [];
  library.settings = { ...base.settings, ...(library.settings || {}) };
  if (!library.foldersById[FIREFOX_DEFAULT_FOLDER_ID]) {
    library.foldersById[FIREFOX_DEFAULT_FOLDER_ID] = base.foldersById[FIREFOX_DEFAULT_FOLDER_ID];
  }
  if (!library.folderOrder.includes(FIREFOX_DEFAULT_FOLDER_ID)) {
    library.folderOrder.unshift(FIREFOX_DEFAULT_FOLDER_ID);
  }
  return library;
}

async function firefoxLoadLibrary() {
  const syncData = await firefoxCall(chrome.storage.sync, 'get', FIREFOX_STORAGE_KEY).catch(() => ({}));
  const localData = await firefoxCall(chrome.storage.local, 'get', FIREFOX_STORAGE_KEY).catch(() => ({}));
  return firefoxNormalizeLibrary(syncData[FIREFOX_STORAGE_KEY] || localData[FIREFOX_STORAGE_KEY] || firefoxCreateDefaultLibrary());
}

async function firefoxSaveLibrary(library) {
  library.lastUpdatedAt = firefoxNow();
  try {
    await firefoxCall(chrome.storage.sync, 'set', {
      [FIREFOX_STORAGE_KEY]: library
    });
  } catch (error) {
    await firefoxCall(chrome.storage.local, 'set', {
      [FIREFOX_STORAGE_KEY]: library
    });
  }
  return library;
}

async function firefoxAddEntry(entryInput) {
  const library = await firefoxLoadLibrary();
  const existingId = library.entryOrder.find(entryId => library.entriesById[entryId]?.url === entryInput.url);
  const entryId = existingId || firefoxCreateId('entry');
  const timestamp = firefoxNow();
  const entry = {
    id: entryId,
    url: entryInput.url,
    title: entryInput.title || firefoxNormalizeDomain(entryInput.url) || entryInput.url,
    description: entryInput.description || `Saved from ${firefoxNormalizeDomain(entryInput.url) || 'the web'}`,
    domain: firefoxNormalizeDomain(entryInput.url),
    faviconUrl: entryInput.faviconUrl || firefoxBuildFaviconUrl(entryInput.url),
    folderId: FIREFOX_DEFAULT_FOLDER_ID,
    tagIds: [],
    favorite: false,
    pinned: false,
    read: false,
    createdAt: library.entriesById[entryId]?.createdAt || timestamp,
    updatedAt: timestamp
  };
  library.entriesById[entryId] = entry;
  library.entryOrder = [entryId, ...library.entryOrder.filter(id => id !== entryId)];
  return firefoxSaveLibrary(library);
}

function firefoxCreateMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: FIREFOX_PAGE_MENU_ID,
      title: 'Save page to Violet Reading List',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: FIREFOX_LINK_MENU_ID,
      title: 'Save link to Violet Reading List',
      contexts: ['link']
    });
  });
}

function firefoxRequestMetadata(tabId) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { type: 'VIOLET_GET_PAGE_METADATA' }, response => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }
      resolve(response || {});
    });
  });
}

async function firefoxSaveCurrentTab(tab) {
  if (!tab || !tab.url) {
    return;
  }
  const metadata = tab.id ? await firefoxRequestMetadata(tab.id) : {};
  await firefoxAddEntry({
    url: tab.url,
    title: metadata.title || tab.title,
    description: metadata.description,
    faviconUrl: metadata.faviconUrl || tab.favIconUrl
  });
}

async function firefoxSaveLink(info) {
  if (!info.linkUrl) {
    return;
  }
  const domain = firefoxNormalizeDomain(info.linkUrl) || info.linkUrl;
  await firefoxAddEntry({
    url: info.linkUrl,
    title: info.selectionText || domain,
    description: `Saved link from ${domain}`,
    faviconUrl: firefoxBuildFaviconUrl(info.linkUrl)
  });
}

chrome.runtime.onInstalled.addListener(() => {
  firefoxCreateMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === FIREFOX_PAGE_MENU_ID) {
    firefoxSaveCurrentTab(tab).catch(() => undefined);
  }
  if (info.menuItemId === FIREFOX_LINK_MENU_ID) {
    firefoxSaveLink(info).catch(() => undefined);
  }
});
