chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-in-external",
    title: "Open in Target",
    contexts: ["page", "link", "selection"]
  });
});
const MAX_TARGETS = 6;
const ROOT_ID = 'open-in-external-root';
const DEFAULT_ID = 'open-in-external-default';
const MANAGE_ID = 'open-in-external-manage';

let nativePort = null;

function connectHost() {
  if (nativePort) return;
  nativePort = chrome.runtime.connectNative("com.browser.bridge");
  nativePort.onMessage.addListener((response) => {
    if (response && response.status === "error") {
      console.error("Bridge error:", response.error);
    }
  });
  nativePort.onDisconnect.addListener(() => {
    console.log("Native host disconnected:", chrome.runtime.lastError);
    nativePort = null;
    // Automatically reconnect to keep the service worker and host alive
    setTimeout(connectHost, 5000);
  });
}

// Establish the persistent connection immediately
connectHost();

function sendNative(url, browser) {
  if (!nativePort) {
    connectHost();
  }
  try {
    nativePort.postMessage({ url, browser });
  } catch (e) {
    console.error("Failed to post message, falling back:", e);
    chrome.runtime.sendNativeMessage("com.browser.bridge", { url, browser }, (response) => {
      if (chrome.runtime.lastError) console.error("Native Messaging Error:", chrome.runtime.lastError.message);
    });
  }
}

function buildContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: ROOT_ID, title: "Open in Target", contexts: ["page", "link", "selection"] });
    chrome.contextMenus.create({ id: DEFAULT_ID, parentId: ROOT_ID, title: "Open in Default Browser", contexts: ["page", "link", "selection"] });
    chrome.contextMenus.create({ id: MANAGE_ID, parentId: ROOT_ID, title: "Manage Targets...", contexts: ["page"] });

    chrome.storage.local.get({ targets: [] }, (items) => {
      const targets = items.targets || [];
      for (let i = 0; i < Math.min(targets.length, MAX_TARGETS); i++) {
        const t = targets[i];
        const id = `open-in-external-target-${i}`;
        chrome.contextMenus.create({ id, parentId: ROOT_ID, title: `${t.name || ('Target ' + (i+1))}`, contexts: ["page", "link", "selection"] });
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  buildContextMenus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.targets) buildContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = (tab && tab.url) || info.linkUrl || info.pageUrl || info.srcUrl;
  if (!url) {
    console.error('No URL available to send');
    return;
  }

  if (info.menuItemId === DEFAULT_ID) {
    sendNative(url, null);
    return;
  }

  if (info.menuItemId === MANAGE_ID) {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (info.menuItemId && info.menuItemId.startsWith('open-in-external-target-')) {
    const idx = parseInt(info.menuItemId.split('-').pop(), 10);
    chrome.storage.local.get({ targets: [] }, (items) => {
      const targets = items.targets || [];
      const t = targets[idx];
      const browser = t && t.browserPath;
      sendNative(url, browser);
    });
  }
});