/**
 * GeetKosh Background Service Worker (Manifest V3)
 */

const DEFAULT_CONFIG = {
  backend_url: 'https://geet-backend.sandipkc.com.np',
  bearer_token: '',
  default_genre: 'Adhunik',
  auto_open_studio: true
};

const captionTracksCache = new Map();

// Initialize settings upon extension install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['backend_url', 'bearer_token'], (res) => {
    if (!res.backend_url) {
      chrome.storage.local.set(DEFAULT_CONFIG);
    }
  });

  // Create context menu for YouTube links and pages
  chrome.contextMenus.create({
    id: 'geetkosh_import_song',
    title: '📥 Import Song to GeetKosh',
    contexts: ['page', 'link'],
    documentUrlPatterns: ['*://*.youtube.com/*']
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'geetkosh_import_song' && tab && tab.id) {
    chrome.action.openPopup();
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_HARVEST_DRAWER') {
    // Attempt to open the extension popup if supported by the browser
    if (chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {
        // Fallback: set badge
        if (sender.tab && sender.tab.id) {
          chrome.action.setBadgeText({ text: 'READY', tabId: sender.tab.id });
          chrome.action.setBadgeBackgroundColor({ color: '#C81E1E', tabId: sender.tab.id });
        }
      });
    }
    sendResponse({ received: true });
  }

  if (request.action === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: request.title || 'GeetKosh Harvester',
      message: request.message || 'Action completed successfully.'
    });
  }

  // InnerTube API proxy with memory caching to bypass web client poToken blocks & rate limits
  if (request.action === 'FETCH_YOUTUBE_INNERTUBE_TRACKS') {
    (async () => {
      try {
        const videoId = request.videoId;
        if (!videoId) return sendResponse({ success: false, error: 'No videoId' });

        if (captionTracksCache.has(videoId)) {
          return sendResponse({ success: true, tracks: captionTracksCache.get(videoId) });
        }

        const apiKey = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
        const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'ANDROID',
                clientVersion: '20.10.38'
              }
            },
            videoId: videoId
          })
        });

        if (!res.ok) return sendResponse({ success: false, error: `HTTP ${res.status}` });
        const data = await res.json();
        const rawTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

        const tracks = rawTracks.map((t, idx) => {
          let displayName = '';
          if (Array.isArray(t.name?.runs) && t.name.runs.length > 0) {
            displayName = t.name.runs.map(r => r.text || '').join('');
          } else if (t.name?.simpleText) {
            displayName = t.name.simpleText;
          } else {
            displayName = t.languageCode ? t.languageCode.toUpperCase() : `Track ${idx + 1}`;
          }

          return {
            id: idx,
            name: displayName,
            languageCode: t.languageCode || '',
            baseUrl: t.baseUrl || '',
            isAsr: t.kind === 'asr'
          };
        });

        captionTracksCache.set(videoId, tracks);
        sendResponse({ success: true, tracks });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
