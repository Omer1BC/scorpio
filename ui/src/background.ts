// Open sidepanel when extension icon is clicked
chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
