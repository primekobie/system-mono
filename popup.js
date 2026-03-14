document.addEventListener('DOMContentLoaded', async () => {
  const globalToggle = document.getElementById('global-toggle');
  const forceAllToggle = document.getElementById('force-all-toggle');
  const tabToggle = document.getElementById('tab-toggle');
  const tabStatusLabel = document.getElementById('tab-status-label');
  const tabDescription = document.getElementById('tab-description');

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const tabId = tab.id;

  // Load settings
  const settings = await chrome.storage.local.get(['globalEnabled', 'forceAll', 'tabOverrides']);
  const globalEnabled = settings.globalEnabled ?? false;
  const forceAll = settings.forceAll ?? false;
  const tabOverrides = settings.tabOverrides ?? {};

  // Current tab state
  let tabEffectiveState = globalEnabled;
  if (tabId in tabOverrides) {
    tabEffectiveState = tabOverrides[tabId];
  }

  // Initial UI
  globalToggle.checked = globalEnabled;
  forceAllToggle.checked = forceAll;
  tabToggle.checked = tabEffectiveState;
  updateTabUI(tabEffectiveState);

  // Listeners
  globalToggle.addEventListener('change', async () => {
    const isEnabled = globalToggle.checked;
    await chrome.storage.local.set({ globalEnabled: isEnabled, tabOverrides: {} });
    chrome.runtime.sendMessage({ action: 'updateState' });
    tabToggle.checked = isEnabled;
    updateTabUI(isEnabled);
  });

  forceAllToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ forceAll: forceAllToggle.checked });
    chrome.runtime.sendMessage({ action: 'updateState' });
  });

  tabToggle.addEventListener('change', async () => {
    const overrides = (await chrome.storage.local.get(['tabOverrides'])).tabOverrides ?? {};
    overrides[tabId] = tabToggle.checked;
    await chrome.storage.local.set({ tabOverrides: overrides });
    chrome.runtime.sendMessage({ action: 'updateState', tabId });
    updateTabUI(tabToggle.checked);
  });

  function updateTabUI(isOn) {
    tabStatusLabel.textContent = isOn ? "Active for this tab" : "Inactive for this tab";
    tabDescription.textContent = isOn ? "System Mono is running" : "Original fonts active";
  }
});
