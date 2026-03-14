// Get state for specific tab
async function getTabState(tabId) {
  const settings = await chrome.storage.local.get(['globalEnabled', 'forceAll', 'tabOverrides']);
  const globalEnabled = settings.globalEnabled ?? false;
  const forceAll = settings.forceAll ?? false;
  const tabOverrides = settings.tabOverrides ?? {};
  
  let isEnabled = globalEnabled;
  if (tabId in tabOverrides) {
    isEnabled = tabOverrides[tabId];
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
    const tabId = sender.tab?.id;
    if (tabId) {
      getTabState(tabId).then(sendResponse);
      return true; // Keep channel open for async response
    }
  }
});

// Clean up overrides when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const settings = await chrome.storage.local.get(['tabOverrides']);
  const overrides = settings.tabOverrides ?? {};
  if (tabId in overrides) {
    delete overrides[tabId];
    await chrome.storage.local.set({ tabOverrides: overrides });
  }
});
