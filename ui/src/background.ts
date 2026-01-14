// WebSocket connection
let ws: WebSocket | null = null;

function connectWebSocket() {
  const wsUrl = 'ws://localhost:8000/ws';

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('Background worker connected to websocket');
  };

  ws.onmessage = (event) => {
    console.log('Received from server:', event.data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected. Reconnecting in 5 seconds...');
    setTimeout(connectWebSocket, 5000);
  };
}

// Function to send message to websocket
function sendWebSocketMessage(message: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    console.log('Sent to server:', message);
  } else {
    console.error('WebSocket is not connected');
  }
}

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEND_TO_WEBSOCKET') {
    sendWebSocketMessage(request.message);
    sendResponse({ success: true });
  }
  return true;
});

// Connect to websocket when extension starts
connectWebSocket();

// Open sidepanel when extension icon is clicked
chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
