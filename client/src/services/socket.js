let ws;

export function connectSocket(onMessage) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use port 5001 specifically since backend runs on port 5001
  const wsUrl = `${wsProtocol}//${window.location.hostname}:5001`;
  
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connection established.');
  };
  
  ws.onmessage = e => {
    try {
      const data = JSON.parse(e.data);
      onMessage(data);
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  };
  
  ws.onerror = err => {
    console.error('WebSocket error observed:', err);
  };
  
  ws.onclose = () => {
    console.warn('WebSocket connection closed. Reconnecting in 3 seconds...');
    setTimeout(() => connectSocket(onMessage), 3000);
  };
}

export function closeSocket() {
  if (ws) {
    ws.close();
  }
}
