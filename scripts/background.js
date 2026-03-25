import { normalizeLanguage, t } from './i18n.js';
import { addEntry, buildFaviconUrl, loadLibrary } from './storage.js';

const PAGE_MENU_ID = 'violet-save-page';
const LINK_MENU_ID = 'violet-save-link';

async function getCurrentLanguage() {
  const library = await loadLibrary().catch(() => null);
  return normalizeLanguage(library?.settings?.language);
}

async function createMenus() {
  const language = await getCurrentLanguage();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: PAGE_MENU_ID,
      title: t(language, 'menuSavePage'),
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: LINK_MENU_ID,
      title: t(language, 'menuSaveLink'),
      contexts: ['link']
    });
  });
}

async function requestTabMetadata(tabId) {
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

async function saveCurrentTab(tab) {
  if (!tab?.url) {
    throw new Error('No active tab URL was found.');
  }

  const metadata = tab.id ? await requestTabMetadata(tab.id) : {};
  return addEntry({
    url: tab.url,
    title: metadata.title || tab.title || '',
    description: metadata.description || '',
    faviconUrl: metadata.faviconUrl || tab.favIconUrl || buildFaviconUrl(tab.url)
  });
}

async function saveLink(info) {
  if (!info.linkUrl) {
    throw new Error('No link URL was provided.');
  }

  let fallbackTitle = '';
  try {
    fallbackTitle = new URL(info.linkUrl).hostname.replace(/^www\./, '');
  } catch (error) {
    fallbackTitle = info.linkUrl;
  }

  return addEntry({
    url: info.linkUrl,
    title: info.selectionText || fallbackTitle,
    description: `Saved link from ${fallbackTitle}`,
    faviconUrl: buildFaviconUrl(info.linkUrl)
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createMenus().catch(() => undefined);
});

chrome.runtime.onStartup?.addListener(() => {
  createMenus().catch(() => undefined);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === PAGE_MENU_ID && tab) {
    saveCurrentTab(tab).catch(() => undefined);
  }

  if (info.menuItemId === LINK_MENU_ID) {
    saveLink(info).catch(() => undefined);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'VIOLET_SAVE_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      saveCurrentTab(tabs[0])
        .then(result => sendResponse({ ok: true, library: result }))
        .catch(error => sendResponse({ ok: false, error: error.message }));
    });
    return true;
  }

  if (message?.type === 'VIOLET_REFRESH_CONTEXT_MENUS') {
    createMenus()
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
