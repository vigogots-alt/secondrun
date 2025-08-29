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
  private responseResolvers: Map<string, (value: any) => void> = new Map();

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

  sendMessage(eventType: string, payload: any, waitForResponse: boolean = false): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        reject(new Error('WebSocket is not connected.'));
        return;
      }

      const msgId = this.messageId++;
      const message = `42${NAMESPACE},${msgId}["${eventType}",${JSON.stringify(payload)}]`;
      this.sendRaw(message);

      if (waitForResponse) {
        this.responseResolvers.set(String(msgId), resolve);
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

  private determineEvent(payload: any): string {
    if (typeof payload !== 'object' || payload === null) {
      return 'unknown';
    }
    if ('user' in payload) return 'auth';
    if ('leaderBoards' in payload) return 'getLeaderBoard';
    if ('leaderboard' in payload) return 'leaderboard';
    if ('rate' in payload) return 'getRate';
    if ('levels' in payload) return 'getLevels';
    if ('upgrades' in payload) return 'getUpgrades';
    if ('friends' in payload) return 'getFriends';
    if ('friendRequests' in payload) return 'getFriendRequests';
    if ('notifications' in payload || 'userNotifications' in payload) return 'getUserNotification';
    if ('users' in payload || 'userList' in payload) return 'userListForFriend';
    if ('deleted' in payload) return 'deleteAccount';
    if ('swap' in payload || 'transaction' in payload) return 'swapTransactions';
    if ('bonus' in payload) return 'collectBonus';
    if ('payout' in payload) return 'payoutFTN';
    if ('error' in payload) return 'error';
    if ('profile' in payload) return 'profileUpdate'; // Custom event for profile updates
    return 'unknown';
  }

  private parseSocketMessage(message: string): { msgId?: string; eventType: string; payload: any } | null {
    if (message === '3') { // Pong response
      return { eventType: 'pong', payload: null };
    }

    if (message.startsWith('0{')) { // Initial connect data
      try {
        const data = JSON.parse(message.substring(1));
        return { eventType: 'initial_connect', payload: data };
      } catch (e) {
        this.emit('log', `Error parsing initial connect message: ${e}`);
        return null;
      }
    }

    if (message === '40' + NAMESPACE + ',') { // Namespace connected
      return { eventType: 'namespace_connected', payload: null };
    }

    // Regex to capture messages like 43/first-run2,MSG_ID[...JSON_ARRAY_STRING...]
    // or 42/first-run2,MSG_ID[...JSON_ARRAY_STRING...]
    const socketIOMessageRegex = /^4([23])\/first-run2,(\d*)(.*)$/;
    const match = message.match(socketIOMessageRegex);

    if (match) {
      const type = match[1]; // '2' for server-sent, '3' for ack/response
      const msgId = match[2]; // Can be empty for server-initiated messages
      const jsonArrayString = match[3]; // This will be the `[...]` part

      try {
        const parsedArray = JSON.parse(jsonArrayString);

        let eventType: string | undefined;
        let payload: any;

        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          if (type === '3') { // Response to client-sent message
            if (parsedArray.length === 0) {
              eventType = 'ack';
              payload = {};
            } else if (typeof parsedArray[0] === 'string') {
              try {
                // Attempt to parse the first element as JSON
                const innerPayload = JSON.parse(parsedArray[0]);
                eventType = this.determineEvent(innerPayload);
                payload = innerPayload;
              } catch {
                // If not JSON, treat as a simple string event type
                eventType = parsedArray[0];
                payload = parsedArray.length > 1 ? parsedArray[1] : {};
              }
            } else {
              // If the first element is not a string, it might be the payload directly
              eventType = this.determineEvent(parsedArray[0]);
              payload = parsedArray[0];
            }
          } else if (type === '2') { // Server-initiated message
            eventType = parsedArray[0];
            if (typeof parsedArray[1] === 'string') {
              // Handle cases like ["profileUpdate", "{\"profile\":{...}}"]
              payload = JSON.parse(parsedArray[1]);
            } else {
              payload = parsedArray[1];
            }
          }
        } else {
          eventType = 'ack'; // Empty array, likely an acknowledgement
          payload = {};
        }

        return { msgId, eventType: eventType || 'unknown', payload };
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

    const { msgId, eventType, payload } = parsed;

    // If there's a resolver for this message ID, resolve it
    if (msgId && this.responseResolvers.has(msgId)) {
      const resolve = this.responseResolvers.get(msgId);
      if (resolve) {
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