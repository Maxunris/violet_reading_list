import { chromium } from 'playwright';
import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const projectRoot = '/Users/max/PycharmProjects/Reading_list';
const extensionPath = path.join(projectRoot, 'dist/chromium');
const userDataDir = path.join(projectRoot, '.tmp-extension-profile-verify');
const samplePagePath = path.join(projectRoot, '.tmp-sample-page-verify.html');
const exportPath = path.join(projectRoot, '.tmp-export-verify.json');

await rm(userDataDir, { recursive: true, force: true });
await mkdir(userDataDir, { recursive: true });
await writeFile(
  samplePagePath,
  '<!doctype html><html><head><title>Alpha Article</title><meta name="description" content="A focused page for extension testing."><link rel="icon" href="https://example.com/favicon.ico"></head><body><main><h1>Alpha Article</h1><a id="beta" href="https://beta.example.com/story">Beta Story</a></main></body></html>'
);

const context = await chromium.launchPersistentContext(userDataDir, {
  ignoreDefaultArgs: ['--disable-extensions'],
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-first-run',
    '--no-default-browser-check'
  ]
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function resolveExtensionId() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const worker = context.serviceWorkers()[0];
    if (worker) {
      return new URL(worker.url()).host;
    }
    try {
      const worker = await context.waitForEvent('serviceworker', { timeout: 250 });
      return new URL(worker.url()).host;
    } catch (error) {
      await sleep(100);
    }
  }

  throw new Error('Unable to resolve extension id.');
}

const extensionId = await resolveExtensionId();
const popupUrl = `chrome-extension://${extensionId}/popup.html`;
const optionsUrl = `chrome-extension://${extensionId}/options.html`;
const samplePageUrl = pathToFileURL(samplePagePath).href;

const results = [];

async function record(name, fn) {
  console.error(`START ${name}`);
  try {
    await Promise.race([
      fn(),
      sleep(15000).then(() => {
        throw new Error('timed out after 15s');
      })
    ]);
    results.push({ name, status: 'passed' });
    console.error(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'failed', error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function step(message) {
  console.error(`  -> ${message}`);
}

async function openPopup() {
  const page = await context.newPage();
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' && text.includes('Failed to load resource')) {
      return;
    }
    console.error(`popup console ${message.type()}: ${text}`);
  });
  page.on('pageerror', error => {
    console.error(`popup pageerror: ${error.message}`);
  });
  await page.goto(popupUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(150);
  return page;
}

async function preparePopup(library) {
  await seedLibrary(library);
  const popup = await openPopup();
  return popup;
}

async function seedLibrary(payload) {
  const page = await openPopup();
  await page.evaluate(async library => {
    const call = (area, method, value) => new Promise(resolve => {
      const callback = () => resolve(chrome.runtime.lastError?.message || null);
      if (typeof value === 'undefined') {
        area[method](callback);
        return;
      }
      area[method](value, callback);
    });
    await call(chrome.storage.local, 'clear');
    await call(chrome.storage.sync, 'clear');
    const localError = await call(chrome.storage.local, 'set', { readingListData: library });
    if (localError) {
      throw new Error(localError);
    }
  }, payload);
  await page.waitForTimeout(100);
  await page.close();
}

function createSeedLibrary() {
  const now = new Date().toISOString();
  return {
    version: 1,
    lastUpdatedAt: now,
    foldersById: {
      folder_inbox: {
        id: 'folder_inbox',
        name: 'Inbox',
        createdAt: now,
        updatedAt: now,
        system: true
      }
    },
    folderOrder: ['folder_inbox'],
    tagsById: {},
    tagOrder: [],
    entriesById: {
      entry_alpha: {
        id: 'entry_alpha',
        url: 'https://example.com/article',
        title: 'Alpha Article',
        description: 'A focused page for extension testing.',
        domain: 'example.com',
        faviconUrl: 'https://icons.duckduckgo.com/ip3/example.com.ico',
        folderId: 'folder_inbox',
        tagIds: [],
        favorite: false,
        pinned: false,
        read: false,
        createdAt: now,
        updatedAt: now
      }
    },
    entryOrder: ['entry_alpha'],
    settings: {
      selectedFolderId: 'folder_inbox',
      activeView: 'folder'
    }
  };
}

function createLibraryWithFolder() {
  const library = createSeedLibrary();
  const now = new Date().toISOString();
  library.foldersById.folder_research = {
    id: 'folder_research',
    name: 'Deep Research',
    createdAt: now,
    updatedAt: now,
    system: false
  };
  library.folderOrder.push('folder_research');
  return library;
}

function createLibraryWithTagsAndFlags() {
  const library = createLibraryWithFolder();
  const now = new Date().toISOString();
  library.tagsById.tag_urgent = {
    id: 'tag_urgent',
    name: 'urgent',
    createdAt: now,
    updatedAt: now
  };
  library.tagsById.tag_reading = {
    id: 'tag_reading',
    name: 'reading',
    createdAt: now,
    updatedAt: now
  };
  library.tagOrder = ['tag_urgent', 'tag_reading'];
  library.entriesById.entry_alpha = {
    ...library.entriesById.entry_alpha,
    folderId: 'folder_research',
    tagIds: ['tag_urgent', 'tag_reading'],
    favorite: true,
    pinned: true,
    read: true,
    description: 'Updated description for smoke test'
  };
  library.settings.selectedFolderId = 'folder_research';
  return library;
}

try {
  await seedLibrary(createSeedLibrary());

  await record('entry modal stays hidden on first popup render', async () => {
    const popup = await preparePopup(createSeedLibrary());
    const hidden = await popup.locator('#entry-modal').evaluate(node => node.hidden);
    const display = await popup.locator('#entry-modal').evaluate(node => getComputedStyle(node).display);
    if (!hidden) throw new Error('entry modal is not hidden on first render');
    if (display !== 'none') throw new Error(`entry modal display should be none, got ${display}`);
    await popup.close();
  });

  await record('compact popup layout keeps save button visible', async () => {
    const popup = await preparePopup(createSeedLibrary());
    await popup.setViewportSize({ width: 780, height: 640 });
    await popup.waitForTimeout(100);
    const layout = await popup.evaluate(() => {
      const button = document.getElementById('save-current');
      const rect = button.getBoundingClientRect();
      return {
        label: button.textContent?.trim() || '',
        right: rect.right,
        left: rect.left,
        top: rect.top,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth
      };
    });
    if (layout.label !== '+ Save tab') throw new Error(`unexpected save button label ${layout.label}`);
    if (layout.right > layout.viewportWidth) throw new Error(`save button clipped on the right: ${JSON.stringify(layout)}`);
    if (layout.left < 0 || layout.top < 0 || layout.bottom > layout.viewportHeight) throw new Error(`save button out of viewport: ${JSON.stringify(layout)}`);
    if (layout.scrollWidth > layout.viewportWidth) throw new Error(`horizontal overflow detected: ${JSON.stringify(layout)}`);
    await popup.close();
  });

  await record('popup renders seeded entry with readable metadata', async () => {
    const popup = await preparePopup(createSeedLibrary());
    await popup.waitForSelector('.entry-card');
    const title = await popup.locator('.entry-title').first().textContent();
    const description = await popup.locator('.entry-description').first().textContent();
    const badges = await popup.locator('.entry-meta .badge').allTextContents();
    if (title !== 'Alpha Article') throw new Error(`unexpected title ${title}`);
    if (!description?.includes('focused page')) throw new Error(`unexpected description ${description}`);
    if (!badges.some(text => text.includes('example.com'))) throw new Error(`domain badge missing: ${badges.join(',')}`);
    await popup.close();
  });

  await record('folder create and inline rename work', async () => {
    const popup = await preparePopup(createSeedLibrary());
    await popup.locator('#folder-name').fill('Research');
    await popup.locator('#folder-form').evaluate(form => form.requestSubmit());
    await popup.waitForTimeout(200);
    const folderRow = popup.locator('.folder-row', { hasText: 'Research' }).first();
    if (await folderRow.count() !== 1) throw new Error('new folder not rendered');
    await folderRow.locator('.micro-button').first().dispatchEvent('click');
    await popup.locator('.inline-rename-input').fill('Deep Research');
    await popup.locator('.inline-rename-form').evaluate(form => form.requestSubmit());
    await popup.waitForTimeout(200);
    const renamed = popup.locator('.folder-row', { hasText: 'Deep Research' }).first();
    if (await renamed.count() !== 1) throw new Error('renamed folder not rendered');
    await popup.close();
  });

  await record('tag create rename and delete work through tag manager', async () => {
    const popup = await preparePopup(createSeedLibrary());
    step('open tag manager');
    await popup.locator('#manage-tags').dispatchEvent('click');
    step('create tag');
    await popup.locator('#tag-name').fill('priority');
    await popup.locator('#tag-form').evaluate(form => form.requestSubmit());
    await popup.waitForTimeout(200);
    let row = popup.locator('.tag-library-item', { hasText: 'priority' }).first();
    if (await row.count() !== 1) throw new Error('tag not created');
    step('rename tag');
    await row.locator('.micro-button').first().dispatchEvent('click');
    await popup.waitForTimeout(100);
    const tagRenameInputs = await popup.locator('.inline-rename-input').count();
    if (tagRenameInputs === 0) {
      const tagRows = await popup.locator('.tag-library-item').evaluateAll(nodes => nodes.map(node => node.textContent));
      throw new Error(`tag rename input did not appear; rows=${JSON.stringify(tagRows)}`);
    }
    await popup.locator('.inline-rename-input').fill('urgent');
    await popup.locator('.inline-rename-form').evaluate(form => form.requestSubmit());
    await popup.waitForTimeout(200);
    row = popup.locator('.tag-library-item', { hasText: 'urgent' }).first();
    if (await row.count() !== 1) throw new Error('tag not renamed');
    step('delete tag');
    await popup.evaluate(() => { window.confirm = () => true; });
    await row.locator('.micro-button').nth(1).dispatchEvent('click');
    await popup.waitForTimeout(200);
    if (await popup.locator('.tag-library-item', { hasText: 'urgent' }).count() !== 0) throw new Error('tag not deleted');
    await popup.close();
  });

  await record('tag panel closes cleanly before entry editing', async () => {
    const popup = await preparePopup(createSeedLibrary());
    await popup.locator('#manage-tags').dispatchEvent('click');
    let tagPanelHidden = await popup.locator('#tag-manager-panel').evaluate(node => node.hidden);
    if (tagPanelHidden) throw new Error('tag panel did not open');
    await popup.locator('.entry-card .edit-button').first().dispatchEvent('click');
    await popup.waitForTimeout(150);
    tagPanelHidden = await popup.locator('#tag-manager-panel').evaluate(node => node.hidden);
    const entryModalHidden = await popup.locator('#entry-modal').evaluate(node => node.hidden);
    if (!tagPanelHidden) throw new Error('tag panel stayed open over entry modal');
    if (entryModalHidden) throw new Error('entry modal did not open');
    await popup.locator('#close-entry-modal').dispatchEvent('click');
    await popup.locator('#manage-tags').dispatchEvent('click');
    await popup.locator('#close-tag-panel').dispatchEvent('click');
    tagPanelHidden = await popup.locator('#tag-manager-panel').evaluate(node => node.hidden);
    if (!tagPanelHidden) throw new Error('tag panel did not close from close button');
    await popup.close();
  });

  await record('entry edit flow updates folder, tags, favorite, pin and read state', async () => {
    const popup = await preparePopup(createLibraryWithFolder());
    await popup.waitForSelector('.entry-card');
    step('open entry editor');
    await popup.locator('.entry-card .edit-button').first().dispatchEvent('click');
    await popup.waitForTimeout(150);
    step('update entry fields');
    const folderOptions = await popup.locator('#entry-folder option').allTextContents();
    if (!folderOptions.includes('Deep Research')) {
      throw new Error(`folder options missing target folder: ${folderOptions.join(',')}`);
    }
    await popup.locator('#entry-folder').selectOption({ label: 'Deep Research' });
    await popup.locator('#entry-tags').fill('urgent, reading');
    await popup.locator('#entry-favorite').check();
    await popup.locator('#entry-pinned').check();
    await popup.locator('#entry-read').check();
    await popup.locator('#entry-description').fill('Updated description for smoke test');
    step('submit entry form');
    await popup.locator('#entry-form').evaluate(form => form.requestSubmit());
    await popup.waitForTimeout(250);
    step('validate rendered entry');
    const entryCount = await popup.locator('.entry-card').count();
    const badges = await popup.locator('.entry-badges .badge').allTextContents();
    const tags = await popup.locator('.entry-tags .badge').allTextContents();
    const meta = await popup.locator('.entry-meta .badge').allTextContents();
    if (!badges.includes('Favorite') || !badges.includes('Pinned')) {
      const storage = await popup.evaluate(async () => new Promise(resolve => chrome.storage.local.get('readingListData', resolve)));
      throw new Error(`missing entry badges count=${entryCount} badges=${badges.join(',')} tags=${tags.join(',')} meta=${meta.join(',')} storage=${JSON.stringify(storage)}`);
    }
    if (!tags.includes('#urgent') || !tags.includes('#reading')) throw new Error(`missing tag chips ${tags.join(',')}`);
    if (!meta.some(text => text.includes('Deep Research'))) throw new Error(`folder badge not updated ${meta.join(',')}`);
    await popup.close();
  });

  await record('search by text, domain and tag narrows results', async () => {
    const popup = await preparePopup(createLibraryWithTagsAndFlags());
    await popup.waitForSelector('.entry-card');
    await popup.locator('#search-query').fill('Updated description');
    if (await popup.locator('.entry-card').count() !== 1) throw new Error('text filter removed expected entry');
    await popup.locator('#search-query').fill('missing words');
    await popup.waitForTimeout(150);
    if (await popup.locator('.entry-card').count() !== 0) throw new Error('text filter did not empty results');
    await popup.locator('#clear-filters').dispatchEvent('click');
    await popup.locator('#domain-query').fill('example.com');
    await popup.waitForTimeout(150);
    if (await popup.locator('.entry-card').count() !== 1) throw new Error('domain filter removed expected entry');
    await popup.locator('.entry-tags .badge', { hasText: '#urgent' }).first().dispatchEvent('click');
    await popup.waitForTimeout(150);
    if (await popup.locator('.entry-card').count() !== 1) throw new Error('tag click filter removed expected entry');
    await popup.close();
  });

  await record('favorites, pinned and unread views behave correctly', async () => {
    const popup = await preparePopup(createLibraryWithTagsAndFlags());
    await popup.waitForSelector('.entry-card');
    await popup.locator('#view-list').getByRole('button', { name: 'Favorites' }).dispatchEvent('click');
    if (await popup.locator('.entry-card').count() !== 1) throw new Error('favorites view missing favorite entry');
    await popup.locator('#view-list').getByRole('button', { name: 'Pinned' }).dispatchEvent('click');
    if (await popup.locator('.entry-card').count() !== 1) throw new Error('pinned view missing pinned entry');
    await popup.locator('#view-list').getByRole('button', { name: 'Unread' }).dispatchEvent('click');
    if (await popup.locator('.entry-card').count() !== 0) throw new Error('unread view should be empty after marking entry read');
    await popup.close();
  });

  await record('folder delete reassigns entry back to inbox', async () => {
    const seeded = createLibraryWithFolder();
    seeded.entriesById.entry_alpha.folderId = 'folder_research';
    seeded.settings.selectedFolderId = 'folder_research';
    const popup = await preparePopup(seeded);
    await popup.waitForSelector('.entry-card');
    const row = popup.locator('.folder-row', { hasText: 'Deep Research' }).first();
    await popup.evaluate(() => { window.confirm = () => true; });
    await row.locator('.micro-button').nth(1).dispatchEvent('click');
    await popup.waitForTimeout(250);
    const folderLabels = await popup.locator('.entry-meta .badge').allTextContents();
    if (!folderLabels.some(text => text.includes('Inbox'))) throw new Error(`entry not reassigned to inbox: ${folderLabels.join(',')}`);
    await popup.close();
  });

  await record('options export and replace import work', async () => {
    await seedLibrary(createSeedLibrary());
    const options = await context.newPage();
    await options.goto(optionsUrl);
    const downloadPromise = options.waitForEvent('download');
    await options.getByRole('button', { name: 'Export library' }).click();
    const download = await downloadPromise;
    await download.saveAs(exportPath);
    const exported = JSON.parse(await readFile(exportPath, 'utf8'));
    exported.entriesById = {};
    exported.entryOrder = [];
    await writeFile(exportPath, JSON.stringify(exported));
    await options.locator('#import-mode').selectOption('replace');
    await options.locator('#import-file').setInputFiles(exportPath);
    await options.getByRole('button', { name: 'Import file' }).click();
    await options.waitForTimeout(250);
    await options.close();
    const popup = await openPopup();
    if (await popup.locator('.entry-card').count() !== 0) throw new Error('replace import did not clear entries');
    await popup.close();
  });

  await record('keyboard shortcuts focus search and close entry modal', async () => {
    const popup = await preparePopup(createSeedLibrary());
    await popup.waitForSelector('.entry-card');
    await popup.keyboard.press('/');
    const focusedId = await popup.evaluate(() => document.activeElement?.id || '');
    if (focusedId !== 'search-query') throw new Error(`expected search-query focus, got ${focusedId}`);
    await popup.locator('.entry-card .edit-button').first().dispatchEvent('click');
    await popup.keyboard.press('Escape');
    const hidden = await popup.locator('#entry-modal').evaluate(node => node.hidden);
    if (!hidden) throw new Error('entry modal stayed open after Escape');
    await popup.close();
  });

  await record('entry modal close button hides the editor', async () => {
    const popup = await preparePopup(createSeedLibrary());
    await popup.waitForSelector('.entry-card');
    await popup.locator('.entry-card .edit-button').first().dispatchEvent('click');
    await popup.waitForTimeout(100);
    await popup.locator('#close-entry-modal').dispatchEvent('click');
    await popup.waitForTimeout(100);
    const hidden = await popup.locator('#entry-modal').evaluate(node => node.hidden);
    const display = await popup.locator('#entry-modal').evaluate(node => getComputedStyle(node).display);
    if (!hidden) throw new Error('entry modal stayed open after close button');
    if (display !== 'none') throw new Error(`entry modal display should be none after close, got ${display}`);
    await popup.close();
  });

  await record('content script returns page metadata on supported page', async () => {
    const page = await context.newPage();
    await page.goto(samplePageUrl);
    const response = await page.evaluate(async extensionId => {
      return new Promise(resolve => {
        chrome.runtime.sendMessage(extensionId, { ping: true }, () => resolve('page-context-has-no-extension-runtime'));
      });
    }, extensionId).catch(() => 'page-context-has-no-extension-runtime');
    if (response !== 'page-context-has-no-extension-runtime') {
      throw new Error(`unexpected page runtime response ${response}`);
    }
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const metadata = await worker.evaluate(async () => {
      return new Promise(resolve => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
          const tab = tabs[0];
          chrome.tabs.sendMessage(tab.id, { type: 'VIOLET_GET_PAGE_METADATA' }, response => {
            resolve(response || null);
          });
        });
      });
    });
    if (!metadata?.title || !metadata?.description) throw new Error(`metadata missing: ${JSON.stringify(metadata)}`);
    await page.close();
  });

  console.log(JSON.stringify({ extensionId, results }, null, 2));
} finally {
  await context.close();
  await rm(userDataDir, { recursive: true, force: true });
  await rm(samplePagePath, { force: true });
  await rm(exportPath, { force: true });
}
