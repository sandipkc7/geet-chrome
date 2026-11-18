/**
 * GeetKosh Background Service Worker (Manifest V3)
 */

const DEFAULT_CONFIG = {
  backend_url: 'https://geet-backend.sandipkc.com.np',
  bearer_token: '',
  default_genre: 'Adhunik',
  auto_open_studio: true
};

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
});
