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
  public isConnected: boolean = false; // WebSocket connection status
  private engineIoConnected: boolean = false; // Engine.IO handshake status
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private responseResolvers: Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void; originalEventType: string }> = new Map();
  private namespaceConnectResolver: { resolve: () => void; reject: (reason?: any) => void } | null = null;


  constructor() {
    super();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        if (this.engineIoConnected) {
          this.emit('log', 'Already fully connected.');
          resolve();
        } else {
          this.emit('log', 'WebSocket connected, waiting for Engine.IO handshake.');
          this.namespaceConnectResolver = { resolve, reject };
        }
        return;
      }

      this.emit('log', 'Attempting to connect to WebSocket...');
      this.ws = new WebSocket(WS_URL);
      this.engineIoConnected = false; // Reset Engine.IO handshake status
      this.namespaceConnectResolver = { resolve, reject }; // Set resolver for this connection attempt

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('log', 'WebSocket connected.');
        this.emit('status', true);
        // Do NOT resolve here. Wait for Engine.IO handshake and namespace connect.
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
        this.engineIoConnected = false;
        this.emit('status', false);
        this.stopPingPong();
        this.namespaceConnectResolver?.reject(error); // Reject the main connect promise
        this.namespaceConnectResolver = null;
        reject(error); // Also reject the promise returned by this call
      };

      this.ws.onclose = () => {
        this.emit('log', 'WebSocket disconnected.');
        this.isConnected = false;
        this.engineIoConnected = false;
        this.emit('status', false);
        this.stopPingPong();
        // Reject any pending promises when the connection closes
        this.responseResolvers.forEach(({ reject }) => {
          reject(new Error('WebSocket connection closed.'));
        });
        this.responseResolvers.clear();
        this.namespaceConnectResolver?.reject(new Error('WebSocket connection closed.')); // Reject the main connect promise
        this.namespaceConnectResolver = null;
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.emit('log', 'Disconnecting WebSocket...');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.engineIoConnected = false;
      this.emit('status', false);
      this.stopPingPong();
      // Reject any pending promises when explicitly disconnecting
      this.responseResolvers.forEach(({ reject }) => {
        reject(new Error('WebSocket explicitly disconnected.'));
      });
      this.responseResolvers.clear();
      // Also reject the namespaceConnectResolver if it's still pending
      this.namespaceConnectResolver?.reject(new Error('WebSocket explicitly disconnected.'));
      this.namespaceConnectResolver = null;
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

  sendMessage(eventType: string, payload: any, waitForResponse: boolean = false): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('WebSocket is not connected. Please connect first.'));
        return;
      }
      if (!this.engineIoConnected) {
        reject(new Error('WebSocket is connected but Engine.IO handshake not complete. Please wait.'));
        return;
      }
      if (!this.ws) {
        reject(new Error('WebSocket instance is null.'));
        return;
      }

      const msgId = this.messageId++;
      const message = `42${NAMESPACE},${msgId}["${eventType}",${JSON.stringify(payload)}]`;
      this.sendRaw(message);

      if (waitForResponse) {
        this.responseResolvers.set(String(msgId), { resolve, reject, originalEventType: eventType });
        setTimeout(() => {
          if (this.responseResolvers.has(String(msgId))) {
            this.responseResolvers.delete(String(msgId));
            reject(new Error(`Timeout waiting for response to message ID ${msgId} for event ${eventType}`));
          }
        }, 15000); // 15 seconds timeout
      } else {
        resolve(null); // Resolve immediately if not waiting for a specific response
      }
    });
  }

  private parseSocketMessage(message: string): { msgId?: string; eventType: string; payload: any } | null {
    if (message === '3') { // Pong response
      return { eventType: 'pong', payload: null };
    }

    if (message.startsWith('0{')) { // Initial Engine.IO connect data
      try {
        const data = JSON.parse(message.substring(1));
        return { eventType: 'initial_connect', payload: data };
      } catch (e) {
        this.emit('log', `Error parsing initial connect message: ${e}`);
        return null;
      }
    }

    if (message === '40') { // Engine.IO upgrade/ack
      return { eventType: 'engineio_ack', payload: null };
    }

    if (message === '40' + NAMESPACE) { // Socket.IO namespace connected
      return { eventType: 'namespace_connected', payload: null };
    }

    const socketIOMessageRegex = /^4([23])\/first-run2,(\d*)(.*)$/;
    const match = message.match(socketIOMessageRegex);

    if (match) {
      const type = match[1]; // '2' for server-sent, '3' for ack/response
      const msgId = match[2]; // Can be empty for server-initiated messages
      const jsonPart = match[3];

      try {
        const parsedArray = JSON.parse(jsonPart);

        let eventType: string = 'unknown';
        let payload: any = {};

        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          // If the first element is a string, it's the event name
          if (typeof parsedArray[0] === 'string') {
            eventType = parsedArray[0];
            if (parsedArray.length > 1) {
              // Attempt to parse the second element as JSON if it's a string
              try {
                payload = typeof parsedArray[1] === 'string' ? JSON.parse(parsedArray[1]) : parsedArray[1];
              } catch (e) {
                // If it fails, treat it as a literal string or other type
                payload = parsedArray[1];
              }
            }
          } else {
            // If the first element is not a string, it's likely the payload itself
            payload = parsedArray[0];
            eventType = type === '3' ? 'ack_response' : 'server_data_push'; // Generic event types
          }
        } else {
          // Empty array, typically an acknowledgement without specific data
          eventType = 'ack';
          payload = {};
        }

        return { msgId, eventType, payload };
      } catch (e) {
        this.emit('log', `Error parsing JSON part of message: ${e}. Original JSON part: ${jsonPart}`);
        return null;
      }
    }

    this.emit('log', `Unhandled message format: ${message}`);
    return null;
  }

  private handleMessage(message: string) {
    const parsed = this.parseSocketMessage(message);

    if (!parsed) {
      return;
    }

    const { msgId, eventType, payload } = parsed;

    // Handle Engine.IO handshake sequence
    if (eventType === 'initial_connect' && !this.engineIoConnected) {
      this.emit('initial_connect', payload);
      this.sendRaw('40'); // Acknowledge Engine.IO handshake
      // Do NOT send '40/first-run2' here. It's handled by the 'engineio_ack'
      return;
    }

    if (eventType === 'engineio_ack' && !this.engineIoConnected) {
      this.sendRaw('40' + NAMESPACE); // Connect to Socket.IO namespace
      // The 'namespace_connected' event will be emitted when the server responds to this.
      return;
    }

    if (eventType === 'namespace_connected' && !this.engineIoConnected) {
      this.engineIoConnected = true;
      this.startPingPong();
      this.emit('namespace_connected'); // Emit to external listeners
      this.namespaceConnectResolver?.resolve(); // Resolve the main connect promise
      this.namespaceConnectResolver = null;
      return;
    }

    // If there's a resolver for this message ID, resolve it
    if (msgId && this.responseResolvers.has(msgId)) {
      const resolverEntry = this.responseResolvers.get(msgId);
      if (resolverEntry) {
        resolverEntry.resolve({ eventType, payload });
        this.responseResolvers.delete(msgId);
      }
    }

    // Emit a generic 'message' event and specific event types
    this.emit('message', { msgId, eventType, payload });
    this.emit(eventType, payload); // Emit specific event type
  }
}

// Export a singleton instance
export const wsClient = new WebSocketClient();