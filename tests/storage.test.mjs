import test from 'node:test';
import assert from 'node:assert/strict';

function createStorageArea() {
  const store = {};
  return {
    store,
    get(key, callback) {
      if (key === null || typeof key === 'undefined') {
        callback({ ...store });
        return;
      }
      if (typeof key === 'string') {
        callback({ [key]: store[key] });
        return;
      }
      callback({});
    },
    set(value, callback) {
      Object.assign(store, value);
      callback?.();
    },
    remove(key, callback) {
      delete store[key];
      callback?.();
    }
  };
}

const syncArea = createStorageArea();
const localArea = createStorageArea();

globalThis.chrome = {
  runtime: {
    lastError: null,
    getManifest() {
      return {};
    }
  },
  storage: {
    sync: syncArea,
    local: localArea
  }
};

const storage = await import('../scripts/storage.js');

test('creates a default library with inbox folder', async () => {
  const library = storage.createDefaultLibrary();
  assert.equal(library.folderOrder[0], 'folder_inbox');
  assert.equal(library.foldersById.folder_inbox.name, 'Inbox');
});

test('adds an entry and keeps human-friendly metadata', async () => {
  const saved = await storage.addEntry({
    url: 'https://example.com/article',
    title: 'Example article',
    description: 'Readable metadata'
  });

  const entry = saved.entriesById[saved.entryOrder[0]];
  assert.equal(entry.title, 'Example article');
  assert.equal(entry.description, 'Readable metadata');
  assert.equal(entry.domain, 'example.com');
});

test('deleting a folder moves entries back to inbox', async () => {
  const created = await storage.createFolder('Work');
  const folderId = created.folderOrder.find(id => id !== 'folder_inbox');

  const withEntry = await storage.addEntry({
    url: 'https://folder-test.dev/post',
    title: 'Folder entry',
    folderId
  });
  const entryId = withEntry.entryOrder[0];

  await storage.deleteFolder(folderId);
  const library = await storage.loadLibrary();
  assert.equal(library.entriesById[entryId].folderId, 'folder_inbox');
});

test('updating an entry with tag names creates reusable tags', async () => {
  const withEntry = await storage.addEntry({
    url: 'https://tags.dev/post',
    title: 'Tag target'
  });
  const entryId = withEntry.entryOrder[0];

  await storage.updateEntry(entryId, {
    tagNames: ['design', 'work']
  });

  const library = await storage.loadLibrary();
  const entry = library.entriesById[entryId];
  assert.equal(entry.tagIds.length, 2);
  assert.deepEqual(
    entry.tagIds.map(tagId => library.tagsById[tagId].name).sort(),
    ['design', 'work']
  );
});

test('updating an entry URL refreshes normalized domain metadata', async () => {
  const withEntry = await storage.addEntry({
    url: 'https://example.com/original',
    title: 'Original entry'
  });
  const entryId = withEntry.entryOrder[0];

  await storage.updateEntry(entryId, {
    url: 'https://deepresearch.dev/updated'
  });

  const library = await storage.loadLibrary();
  const entry = library.entriesById[entryId];
  assert.equal(entry.url, 'https://deepresearch.dev/updated');
  assert.equal(entry.domain, 'deepresearch.dev');
});

test('settings updates persist selected language', async () => {
  await storage.updateSettings({ language: 'ru' });
  const library = await storage.loadLibrary();
  assert.equal(library.settings.language, 'ru');
});

test('folder and tag names are trimmed to UI-safe limits', async () => {
  const expectedFolderName = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.slice(0, storage.MAX_FOLDER_NAME_LENGTH);
  const expectedTagName = 'abcdefghijklmnopqrstuvwxyz1234567890'.slice(0, storage.MAX_TAG_NAME_LENGTH);

  const withFolder = await storage.createFolder('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');
  const folderId = withFolder.folderOrder.find(id => withFolder.foldersById[id]?.name === expectedFolderName);
  assert.equal(withFolder.foldersById[folderId].name.length, storage.MAX_FOLDER_NAME_LENGTH);

  const withTag = await storage.createTag('abcdefghijklmnopqrstuvwxyz1234567890');
  const tagId = withTag.tagOrder.find(id => withTag.tagsById[id]?.name === expectedTagName);
  assert.equal(withTag.tagsById[tagId].name.length, storage.MAX_TAG_NAME_LENGTH);
});
