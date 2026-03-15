let isEnabled = false;
let forceAll = false;

// Check and fix element font
function processElement(el) {
    if (!el || !el.style) return;

    if (forceAll) {
        el.style.setProperty('font-family', 'monospace', 'important');
        return;
    }

    // Capture computed style
    const computedStyle = window.getComputedStyle(el);
    const fontFamily = computedStyle.fontFamily.toLowerCase();

    // Fix if font stack contains monospace
    if (fontFamily.includes('monospace')) {
        // Tag it so we don't re-process unnecessarily
        if (el.dataset.systemMonoProcessed) return;
        
        el.style.setProperty('font-family', 'monospace', 'important');
        el.dataset.systemMonoProcessed = "true";
    }
}

function processAll() {
    if (!isEnabled) return;
    const all = document.querySelectorAll('*');
    all.forEach(processElement);
}

// Handle dynamic content updates
const observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
                processElement(node);
                // Also check children
                node.querySelectorAll('*').forEach(processElement);
            }
        });
    });
});

async function updateState() {
    const settings = await chrome.storage.local.get(['globalEnabled', 'forceAll', 'siteOverrides']);
    const siteOverrides = settings.siteOverrides ?? {};
    const hostname = window.location.hostname;
    
    // Get current tab settings
    chrome.runtime.sendMessage({ action: 'getTabState' }, (response) => {
        if (chrome.runtime.lastError) return;
        
        const oldEnabled = isEnabled;
        isEnabled = response.isEnabled;
        forceAll = response.forceAll;

        if (isEnabled) {
            processAll();
            observer.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true
            });
        } else if (oldEnabled && !isEnabled) {
            observer.disconnect();
        }
    });
}

// Handle extension updates
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'stateChanged') {
        updateState();
    }
});

// Run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateState);
} else {
    updateState();
}
