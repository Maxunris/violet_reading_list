function getFaviconUrl() {
  const faviconNode = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  return faviconNode?.href || '';
}

function textFromSelectors(root, selectors) {
  for (const selector of selectors) {
    const node = root.querySelector(selector);
    const value = node?.textContent?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function getYouTubeShortsMetadata() {
  const hostname = globalThis.location?.hostname || '';
  const pathname = globalThis.location?.pathname || '';
  if (!hostname.includes('youtube.com') || !pathname.startsWith('/shorts/')) {
    return null;
  }

  const activeRenderer = document.querySelector('ytd-reel-video-renderer[is-active], ytd-reel-video-renderer[is-active="true"]');
  const scope = activeRenderer || document;
  const title = textFromSelectors(scope, [
    '#video-title',
    'h1.ytd-reel-video-renderer',
    'yt-formatted-string.ytd-reel-player-header-renderer'
  ]);
  const description = textFromSelectors(scope, [
    '#description-text',
    '#description-inline-expander',
    'yt-formatted-string#description-text',
    '#channel-name a',
    'ytd-channel-name a'
  ]);

  return {
    title: title || document.title || '',
    description: description || title || '',
    faviconUrl: getFaviconUrl()
  };
}

function getPageMetadata() {
  const shortsMetadata = getYouTubeShortsMetadata();
  if (shortsMetadata) {
    return shortsMetadata;
  }

  const descriptionNode = document.querySelector('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]');
  const titleNode = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]');

  return {
    title: titleNode?.getAttribute('content') || document.title || '',
    description: descriptionNode?.getAttribute('content') || '',
    faviconUrl: getFaviconUrl()
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'VIOLET_GET_PAGE_METADATA') {
    return false;
  }

  sendResponse(getPageMetadata());
  return false;
});
