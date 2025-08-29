// Custom EventEmitter for browser compatibility
class CustomEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Function) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event].filter(
      (l) => l !== listener
    );
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event].forEach((listener) => {
      listener(...args);
    });
  }
}

const WS_URL = 'wss://social.bcsocial.net/socket.io/?transport=websocket&EIO=3';
const NAMESPACE = '/first-run2'; // Corresponds to '40/first-run2' and '42/first-run2'

export class WebSocketClient extends CustomEventEmitter {
  private ws: WebSocket | null = null;
  private messageId: number = 1;
  private isConnected: boolean = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        this.emit('log', 'Already connected or connecting.');
        resolve();
        return;
      }

      this.emit('log', 'Attempting to connect to WebSocket...');
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('log', 'WebSocket connected.');
        this.emit('status', true);
        this.sendRaw('40' + NAMESPACE); // Initial namespace connection
        this.startPingPong();
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message = event.data as string;
        this.emit('log', `← IN: ${message}`);
        this.handleMessage(message);
      };

      this.ws.onerror = (error) => {
        this.emit('log', `WebSocket error: ${error}`);
        this.emit('error', error);
        this.isConnected = false;
        this.emit('status', false);
        this.stopPingPong();
        reject(error);
      };

      this.ws.onclose = () => {
        this.emit('log', 'WebSocket disconnected.');
        this.isConnected = false;
        this.emit('status', false);
        this.stopPingPong();
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.emit('log', 'Disconnecting WebSocket...');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.emit('status', false);
      this.stopPingPong();
    }
  }

  private startPingPong() {
    this.stopPingPong(); // Clear any existing interval
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRaw('2'); // Send ping
      }
    }, 25000); // Ping every 25 seconds
  }

  private stopPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendRaw(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      this.emit('log', `→ OUT: ${message}`);
    } else {
      this.emit('log', `Attempted to send raw message "${message}" but WebSocket is not open.`);
    }
  }

  sendMessage(eventType: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        reject(new Error('WebSocket is not connected.'));
        return;
      }

      const msgId = this.messageId++;
      const message = `42${NAMESPACE},${msgId}["${eventType}",${JSON.stringify(payload)}]`;
      this.sendRaw(message);

      // For simplicity, we'll resolve immediately for now.
      // A more robust solution would involve mapping msgId to a promise resolver.
      // For this app, the `handleMessage` will emit events that the hook listens to.
      resolve(null);
    });
  }

  private handleMessage(message: string) {
    if (message === '3') { // Pong response
      this.emit('log', 'Received pong.');
      return;
    }

    if (message.startsWith('0{')) {
        try {
            const data = JSON.parse(message.substring(1));
            this.emit('initial_connect', data);
        } catch (e) {
            this.emit('log', `Error parsing initial connect message: ${e}`);
        }
        return;
    }

    // Handle Socket.IO namespace connection messages
    if (message === '40') {
        this.emit('log', 'Received Socket.IO namespace handshake (40).');
        // This is the initial handshake for the namespace, not the full connection confirmation
        return;
    }

    if (message === '40' + NAMESPACE + ',') { // Note the comma at the end
        this.emit('log', `Namespace ${NAMESPACE} connected.`);
        this.emit('namespace_connected');
        return;
    }

    // Regex to capture messages like 42/first-run2,MSG_ID[...JSON_ARRAY_STRING...]
    // or 43/first-run2,MSG_ID[...JSON_ARRAY_STRING...]
    const socketIOMessageRegex = /^4[23]\/first-run2,(\d*)(.*)$/;
    const match = message.match(socketIOMessageRegex);

    if (match) {
      const msgId = match[1]; // Can be empty for server-initiated messages
      const jsonArrayString = match[2]; // This will be the `[...]` part

      try {
        const parsedArray = JSON.parse(jsonArrayString); // e.g., `["auth", {...}]` or `["{\"user\":{...}}"]`

        let eventType: string | undefined;
        let payload: any;

        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          if (typeof parsedArray[0] === 'string' && parsedArray.length === 2) {
            // Standard format: ["eventType", payload_object]
            eventType = parsedArray[0];
            payload = parsedArray[1];
          } else if (typeof parsedArray[0] === 'string' && parsedArray.length === 1) {
            // Special case: ["{\"user\":{...}}"] - a single string element that is itself a JSON string
            const innerJsonString = parsedArray[0];
            payload = JSON.parse(innerJsonString); // Parse the inner JSON string
            // Infer event type if possible, e.g., for 'auth'
            if (payload && typeof payload === 'object' && 'user' in payload) {
              eventType = 'auth';
            } else {
              this.emit('log', `Could not infer eventType for single string array payload: ${innerJsonString}`);
              return;
            }
          } else {
            this.emit('log', `Unhandled array structure in message: ${jsonArrayString}`);
            return;
          }
        } else {
          this.emit('log', `Parsed message is not a valid array: ${jsonArrayString}`);
          return;
        }

        this.emit('message', { msgId, eventType, payload });
      } catch (e) {
        this.emit('log', `Error parsing JSON part of message: ${e}. Original JSON part: ${jsonArrayString}`);
      }
      return;
    }

    this.emit('log', `Unhandled message format: ${message}`);
  }
}

// Export a singleton instance
export const wsClient = new WebSocketClient();