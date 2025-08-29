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
  private responseResolvers: Map<string, { resolve: (value: any) => void; originalEventType: string }> = new Map();

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
      this.engineIoConnected = false; // Reset Engine.IO handshake status

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('log', 'WebSocket connected.');
        this.emit('status', true);
        // Do NOT send namespace connect here. Wait for Engine.IO handshake.
        resolve(); // Resolve the promise that the raw WebSocket is open
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
        reject(error);
      };

      this.ws.onclose = () => {
        this.emit('log', 'WebSocket disconnected.');
        this.isConnected = false;
        this.engineIoConnected = false;
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
      this.engineIoConnected = false;
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

  sendMessage(eventType: string, payload: any, waitForResponse: boolean = false): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.engineIoConnected || !this.ws) {
        reject(new Error('WebSocket is not fully connected (Engine.IO handshake not complete).'));
        return;
      }

      const msgId = this.messageId++;
      const message = `42${NAMESPACE},${msgId}["${eventType}",${JSON.stringify(payload)}]`;
      this.sendRaw(message);

      if (waitForResponse) {
        // Store the original eventType along with the resolver
        this.responseResolvers.set(String(msgId), { resolve, originalEventType: eventType });
        // Set a timeout for the response
        setTimeout(() => {
          if (this.responseResolvers.has(String(msgId))) {
            this.responseResolvers.delete(String(msgId));
            reject(new Error(`Timeout waiting for response to message ID ${msgId}`));
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

    if (message === '40' + NAMESPACE + ',') { // Socket.IO namespace connected
      return { eventType: 'namespace_connected', payload: null };
    }

    const socketIOMessageRegex = /^4([23])\/first-run2,(\d*)(.*)$/;
    const match = message.match(socketIOMessageRegex);

    if (match) {
      const type = match[1]; // '2' for server-sent, '3' for ack/response
      const msgId = match[2]; // Can be empty for server-initiated messages
      const jsonArrayString = match[3];

      try {
        const parsedArray = JSON.parse(jsonArrayString);

        let eventType: string = 'unknown';
        let payload: any = {};

        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          // Check for the specific problematic format: ["{\"key\":\"value\"}"]
          // This happens for 'auth' responses where the entire user object is stringified as the first element.
          if (parsedArray.length === 1 && typeof parsedArray[0] === 'string' && parsedArray[0].startsWith('{') && parsedArray[0].endsWith('}')) {
            try {
              payload = JSON.parse(parsedArray[0]);
              eventType = 'response_payload_only'; // A special internal event type
            } catch (e) {
              // If it's not valid JSON, treat it as a regular string event name
              eventType = parsedArray[0];
              payload = {};
            }
          } else if (typeof parsedArray[0] === 'string') {
            // Standard Socket.IO event: ["eventName", payload]
            eventType = parsedArray[0];
            if (parsedArray.length > 1) {
              // Handle cases where payload itself is a JSON string (double-encoded)
              payload = typeof parsedArray[1] === 'string' ? JSON.parse(parsedArray[1]) : parsedArray[1];
            }
          } else {
            // If the first element is not a string, it's likely the payload itself.
            payload = parsedArray[0];
            eventType = type === '3' ? 'ack_response' : 'server_data_push';
          }
        } else {
          // Empty array, typically an acknowledgement without specific data
          eventType = 'ack';
          payload = {};
        }

        return { msgId, eventType, payload };
      } catch (e) {
        this.emit('log', `Error parsing JSON part of message: ${e}. Original JSON part: ${jsonArrayString}`);
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

    let { msgId, eventType, payload } = parsed; // Use `let` because eventType might be reassigned

    // Handle Engine.IO handshake sequence
    if (eventType === 'initial_connect' && !this.engineIoConnected) {
      this.emit('initial_connect', payload);
      this.sendRaw('40'); // Acknowledge Engine.IO handshake
      this.sendRaw('40' + NAMESPACE); // Connect to Socket.IO namespace
      this.engineIoConnected = true;
      this.startPingPong();
      return; // Do not process further as a regular message
    }

    // If there's a resolver for this message ID, resolve it
    if (msgId && this.responseResolvers.has(msgId)) {
      const resolverEntry = this.responseResolvers.get(msgId);
      if (resolverEntry) {
        const { resolve, originalEventType } = resolverEntry;

        // If the parsed eventType is our generic 'response_payload_only',
        // use the original eventType from the request.
        // This handles the server sending ["{\"user\":{...}}"] for an 'auth' response.
        if (eventType === 'response_payload_only') {
          eventType = originalEventType;
        }
        
        resolve({ eventType, payload });
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