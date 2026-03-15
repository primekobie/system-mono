// Get state for specific site
async function getSiteState(url) {
  const settings = await chrome.storage.local.get(['globalEnabled', 'forceAll', 'siteOverrides']);
  const globalEnabled = settings.globalEnabled ?? false;
  const forceAll = settings.forceAll ?? false;
  const siteOverrides = settings.siteOverrides ?? {};
  
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch(e) {}

  let isEnabled = globalEnabled;
  if (hostname && hostname in siteOverrides) {
    isEnabled = siteOverrides[hostname];
  }
  
  return { isEnabled, forceAll };
}

// Notify all tabs of state change
async function broadcastUpdate(tabId = null) {
  if (tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'stateChanged' }).catch(() => {});
  } else {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'stateChanged' }).catch(() => {});
    });
  }
}

// Handle cross-script messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateState') {
    broadcastUpdate(message.tabId);
    return;
  }

  if (message.action === 'getTabState') {
    const url = sender.tab?.url;
    if (url) {
      getSiteState(url).then(sendResponse);
      return true;
    }
  }
});

