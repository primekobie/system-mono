document.addEventListener('DOMContentLoaded', async () => {
  const globalToggle = document.getElementById('global-toggle');
  const forceAllToggle = document.getElementById('force-all-toggle');
  const tabToggle = document.getElementById('tab-toggle');
  const tabStatusLabel = document.getElementById('tab-status-label');
  const tabDescription = document.getElementById('tab-description');

  // Setup tab state
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const url = tab.url;
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch (e) {}

  // Load settings
  const settings = await chrome.storage.local.get(['globalEnabled', 'forceAll', 'siteOverrides']);
  const globalEnabled = settings.globalEnabled ?? false;
  const forceAll = settings.forceAll ?? false;
  const siteOverrides = settings.siteOverrides ?? {};

  // Current site state
  let siteEffectiveState = globalEnabled;
  if (hostname && hostname in siteOverrides) {
    siteEffectiveState = siteOverrides[hostname];
  }

  // Initial UI
  globalToggle.checked = globalEnabled;
  forceAllToggle.checked = forceAll;
  tabToggle.checked = siteEffectiveState;
  updateTabUI(siteEffectiveState);

  // Event listeners
  globalToggle.addEventListener('change', async () => {
    const isEnabled = globalToggle.checked;
    await chrome.storage.local.set({ globalEnabled: isEnabled, siteOverrides: {} });
    chrome.runtime.sendMessage({ action: 'updateState' });
    tabToggle.checked = isEnabled;
    updateTabUI(isEnabled);
  });

  forceAllToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ forceAll: forceAllToggle.checked });
    chrome.runtime.sendMessage({ action: 'updateState' });
  });

  tabToggle.addEventListener('change', async () => {
    if (!hostname) return;
    const settings = await chrome.storage.local.get(['siteOverrides']);
    const overrides = settings.siteOverrides ?? {};
    overrides[hostname] = tabToggle.checked;
    await chrome.storage.local.set({ siteOverrides: overrides });
    chrome.runtime.sendMessage({ action: 'updateState' });
    updateTabUI(tabToggle.checked);
  });

  function updateTabUI(isOn) {
    tabStatusLabel.textContent = isOn ? "Active for this site" : "Inactive for this site";
    tabDescription.textContent = isOn ? `${hostname} is fixed` : `Original fonts on ${hostname}`;
  }
});

