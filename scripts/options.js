import { exportLibrary, getStorageAreaName, importLibrary } from './storage.js';

const elements = {
  exportButton: document.getElementById('export-library'),
  importButton: document.getElementById('import-library'),
  importFile: document.getElementById('import-file'),
  importMode: document.getElementById('import-mode'),
  refreshStorage: document.getElementById('refresh-storage'),
  storageStatus: document.getElementById('storage-status'),
  statusMessage: document.getElementById('status-message')
};

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
  elements.storageStatus.textContent = `Active storage area: ${areaName}`;
}

elements.exportButton.addEventListener('click', async () => {
  try {
    const payload = await exportLibrary();
    download(`violet-reading-list-${Date.now()}.json`, payload);
    setStatus('Library exported.');
  } catch (error) {
    setStatus(error.message || 'Export failed.');
  }
});

elements.importButton.addEventListener('click', async () => {
  const file = elements.importFile.files?.[0];
  if (!file) {
    setStatus('Choose a JSON file first.');
    return;
  }

  try {
    const rawText = await file.text();
    await importLibrary(rawText, elements.importMode.value);
    setStatus(`Library imported using ${elements.importMode.value} mode.`);
    await refreshStorageArea();
  } catch (error) {
    setStatus(error.message || 'Import failed.');
  }
});

elements.refreshStorage.addEventListener('click', () => {
  refreshStorageArea().catch(error => setStatus(error.message));
});

refreshStorageArea().catch(error => setStatus(error.message));
