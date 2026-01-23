// Open sidepanel when extension icon is clicked
chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_JS') {
    const codeString = message.code;
    const tabId = message.tabId || sender.tab?.id;

    if (!tabId) {
      sendResponse({ error: 'Tab ID not found' });
      return;
    }

    // Handle async execution
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN",
      func: (code: string) => {
        const stdout: string[] = [];
        const stderr: string[] = [];

        // Capture console.log as stdout
        const originalLog = console.log;
        console.log = (...args) => {
          stdout.push(args.map(String).join(' '));
          originalLog(...args);
        };

        // Capture console.error and console.warn as stderr
        const originalError = console.error;
        const originalWarn = console.warn;

        console.error = (...args) => {
          stderr.push(args.map(String).join(' '));
          originalError(...args);
        };

        console.warn = (...args) => {
          stderr.push(args.map(String).join(' '));
          originalWarn(...args);
        };

        try {
          const result = eval(`(function() { ${code} })()`);
          return {
            result,
            stdout: stdout.join('\n'),
            stderr: stderr.join('\n')
          };
        } catch (error) {
          stderr.push(String(error));
          return {
            result: null,
            stdout: stdout.join('\n'),
            stderr: stderr.join('\n'),
            error: String(error)
          };
        } finally {
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
        }
      },
      args: [codeString]
    }).then((results) => {
      const executionResult = results[0]?.result;
      sendResponse(executionResult);
    }).catch((error) => {
      sendResponse({ error: String(error) });
    });

    return true;  // Keep port open for async response
  }
});