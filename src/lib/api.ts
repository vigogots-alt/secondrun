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
    // Engine.IO messages
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
    if (message === '40') { // Engine.IO upgrade/ack from server
      return { eventType: 'engineio_ack_from_server', payload: null };
    }
    // Use template literal for consistency
    if (message === `40${NAMESPACE},`) { // Socket.IO namespace connected from server
      return { eventType: 'namespace_connected', payload: null };
    }

    // Socket.IO messages (type 42 or 43)
    // Use NAMESPACE constant in regex
    const socketIOMessageRegex = new RegExp(`^4([23])${NAMESPACE},(\\d*)(.*)$`);
    const match = message.match(socketIOMessageRegex);

    if (match) {
      const type = match[1]; // '2' for server-sent, '3' for ack/response
      const msgId = match[2]; // Can be empty for server-initiated messages
      const jsonPart = match[3];

      try {
        const parsedArray = JSON.parse(jsonPart);
        let eventType: string;
        let payload: any;

        if (type === '2') { // Server-sent event: 42/namespace,["event_name", payload]
          eventType = typeof parsedArray[0] === 'string' ? parsedArray[0] : 'unknown_server_event';
          payload = parsedArray.length > 1 ? parsedArray[1] : {};
          // Handle potential nested JSON string in payload
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload);
            } catch (e) { /* ignore */ }
          }
        } else { // type === '3', Acknowledgement: 43/namespace,msgId[payload]
          eventType = 'ack_response'; // Generic type, actual event name from resolver
          payload = parsedArray.length > 0 ? parsedArray[0] : {};
          // Handle potential nested JSON string in payload
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload);
            } catch (e) { /* ignore */ }
          }
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

    if (eventType === 'initial_connect') {
      this.emit('initial_connect', payload);
      this.sendRaw('40'); // Acknowledge Engine.IO handshake
      return;
    }

    if (eventType === 'engineio_ack_from_server') { // Server's 40 response
      this.sendRaw(`40${NAMESPACE}`); // Connect to Socket.IO namespace
      return;
    }

    if (eventType === 'namespace_connected' && !this.engineIoConnected) {
      this.engineIoConnected = true;
      this.startPingPong();
      this.emit('namespace_connected');
      this.namespaceConnectResolver?.resolve();
      this.namespaceConnectResolver = null;
      return;
    }

    // If there's a resolver for this message ID, resolve it
    if (msgId && this.responseResolvers.has(msgId)) {
      const resolverEntry = this.responseResolvers.get(msgId);
      if (resolverEntry) {
        // Use the original event type from the resolver, and the already parsed payload
        resolverEntry.resolve({ eventType: resolverEntry.originalEventType, payload: payload });
        this.responseResolvers.delete(msgId);
      }
    }

    // Emit a generic 'message' event and specific event types
    // Only emit if it's not an 'ack_response' that was already handled by a resolver
    if (!(msgId && eventType === 'ack_response')) {
        this.emit('message', { msgId, eventType, payload });
        this.emit(eventType, payload); // Emit specific event type
    }
  }
}

// Export a singleton instance
export const wsClient = new WebSocketClient();