const TARGETED_CSS = `
code, pre, kbd, samp, textarea, 
.mono, .monospace, 
[style*="font-family: monospace"], 
[style*="font-family: 'monospace'"] {
  font-family: monospace !important;
}
`;

const FORCE_ALL_CSS = `
* {
  font-family: monospace !important;
}
`;

// Helper to check state
async function getSettings(tabId) {
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

// Apply or remove CSS
async function updateTabStyle(tabId) {
  try {
    const { isEnabled, forceAll } = await getSettings(tabId);
    
    // Always remove first to avoid double injection conflicts
    await chrome.scripting.removeCSS({ target: { tabId }, css: TARGETED_CSS, origin: 'USER' });
    await chrome.scripting.removeCSS({ target: { tabId }, css: FORCE_ALL_CSS, origin: 'USER' });

    if (isEnabled) {
      const cssToInject = forceAll ? FORCE_ALL_CSS : TARGETED_CSS;
      await chrome.scripting.insertCSS({
        target: { tabId },
        css: cssToInject,
        origin: 'USER'
      });
    }
  } catch (err) {
    console.debug(`Update failed for tab ${tabId}: ${err.message}`);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateState') {
    if (message.tabId) {
      updateTabStyle(message.tabId);
    } else {
      // Update all active tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => updateTabStyle(tab.id));
      });
    }
  }
});

// Apply on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' || changeInfo.status === 'complete') {
    updateTabStyle(tabId);
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
