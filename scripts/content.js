chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'VIOLET_GET_PAGE_METADATA') {
    return false;
  }

  const descriptionNode = document.querySelector('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]');
  const titleNode = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]');
  const faviconNode = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');

  sendResponse({
    title: titleNode?.getAttribute('content') || document.title || '',
    description: descriptionNode?.getAttribute('content') || '',
    faviconUrl: faviconNode?.href || ''
  });

  return false;
});
