import { normalizeLanguage, t } from './i18n.js';
import { exportLibrary, getStorageAreaName, importLibrary, loadLibrary } from './storage.js';

const elements = {
  exportButton: document.getElementById('export-library'),
  importButton: document.getElementById('import-library'),
  importFile: document.getElementById('import-file'),
  importMode: document.getElementById('import-mode'),
  refreshStorage: document.getElementById('refresh-storage'),
  storageStatus: document.getElementById('storage-status'),
  statusMessage: document.getElementById('status-message')
};

let currentLanguage = 'en';

function applyLocalization() {
  document.documentElement.lang = currentLanguage;
  document.title = t(currentLanguage, 'optionsTitle');
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(currentLanguage, node.dataset.i18n);
  });
}

function setStatus(message) {
  elements.statusMessage.textContent = message;
}

function download(filename, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function refreshStorageArea() {
  const areaName = await getStorageAreaName();
  elements.storageStatus.textContent = t(currentLanguage, 'optionsStatusArea', { area: areaName });
}

elements.exportButton.addEventListener('click', async () => {
  try {
    const payload = await exportLibrary();
    download(`violet-reading-list-${Date.now()}.json`, payload);
    setStatus(t(currentLanguage, 'optionsStatusExported'));
  } catch (error) {
    setStatus(error.message || t(currentLanguage, 'optionsStatusExportFailed'));
  }
});

elements.importButton.addEventListener('click', async () => {
  const file = elements.importFile.files?.[0];
  if (!file) {
    setStatus(t(currentLanguage, 'optionsStatusChooseFile'));
    return;
  }

  try {
    const rawText = await file.text();
    await importLibrary(rawText, elements.importMode.value);
    setStatus(t(currentLanguage, 'optionsStatusImported', { mode: elements.importMode.value }));
    await refreshStorageArea();
  } catch (error) {
    setStatus(error.message || t(currentLanguage, 'optionsStatusImportFailed'));
  }
});

elements.refreshStorage.addEventListener('click', () => {
  refreshStorageArea().catch(error => setStatus(error.message));
});

loadLibrary()
  .then(library => {
    currentLanguage = normalizeLanguage(library.settings.language);
    applyLocalization();
    return refreshStorageArea();
  })
  .catch(error => setStatus(error.message));
