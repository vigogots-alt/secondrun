import { EventEmitter } from 'events';

const WS_URL = 'wss://social.bcsocial.net/socket.io/?transport=websocket&EIO=3';
const NAMESPACE = '/first-run2'; // Corresponds to '40/first-run2' and '42/first-run2'

export class WebSocketClient extends EventEmitter {
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
    
    // Handle initial connection response (e.g., '0{"sid":"...", ...}')
    if (message.startsWith('0{')) {
        try {
            const data = JSON.parse(message.substring(1));
            this.emit('initial_connect', data);
        } catch (e) {
            this.emit('log', `Error parsing initial connect message: ${e}`);
        }
        return;
    }

    // Handle namespace connection response (e.g., '40/first-run2')
    if (message === '40' + NAMESPACE) {
        this.emit('namespace_connected');
        return;
    }

    // Handle standard messages (e.g., '42/first-run2,["auth", {...}]' or '43/first-run2,123["event", {...}]')
    const match42 = message.match(/^42\/first-run2,(\d*)\["(.*?)",(.*)\]$/);
    if (match42) {
      const msgId = match42[1]; // Can be empty for server-initiated messages
      const eventType = match42[2];
      const payloadStr = match42[3];
      try {
        const payload = JSON.parse(payloadStr);
        this.emit('message', { msgId, eventType, payload });
      } catch (e) {
        this.emit('log', `Error parsing 42 message payload: ${e}`);
      }
      return;
    }

    const match43 = message.match(/^43\/first-run2,(\d+)\["(.*?)",(.*)\]$/);
    if (match43) {
      const msgId = match43[1];
      const eventType = match43[2];
      const payloadStr = match43[3];
      try {
        const payload = JSON.parse(payloadStr);
        this.emit('message', { msgId, eventType, payload });
      } catch (e) {
        this.emit('log', `Error parsing 43 message payload: ${e}`);
      }
      return;
    }

    this.emit('log', `Unhandled message format: ${message}`);
  }
}

// Export a singleton instance
export const wsClient = new WebSocketClient();