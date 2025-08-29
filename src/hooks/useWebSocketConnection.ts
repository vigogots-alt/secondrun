import { useState, useEffect, useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';

interface UseWebSocketConnectionResult {
  isConnected: boolean;
  isConnecting: boolean;
  logs: string[];
  addLog: (message: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWebSocketConnection = (): UseWebSocketConnectionResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const timestamp = `${time}.${milliseconds}`;
    setLogs((prev) => [...prev, `${timestamp} ${message}`]);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    addLog('Connecting...');
    try {
      await wsClient.connect();
      // Wait for namespace connection before proceeding with auth
      await new Promise<void>((resolve) => {
        const onNamespaceConnected = () => {
          wsClient.off('namespace_connected', onNamespaceConnected);
          resolve();
        };
        wsClient.on('namespace_connected', onNamespaceConnected);
      });
      addLog('WebSocket connected and namespace established.');
    } catch (error) {
      addLog(`Connection failed: ${error}`);
      toast.error('Failed to connect to WebSocket.');
    } finally {
      setIsConnecting(false);
    }
  }, [addLog]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
    addLog('Disconnected.');
    toast.info('Disconnected from WebSocket.');
  }, [addLog]);

  useEffect(() => {
    wsClient.on('log', addLog);
    wsClient.on('status', setIsConnected);
    wsClient.on('error', (err) => addLog(`WS Error: ${err}`));
    wsClient.on('initial_connect', (data) => addLog(`Initial WS connect data: ${JSON.stringify(data)}`));
    wsClient.on('namespace_connected', () => addLog('Namespace connected.'));

    return () => {
      wsClient.off('log', addLog);
      wsClient.off('status', setIsConnected);
      wsClient.off('error', (err) => addLog(`WS Error: ${err}`));
      wsClient.off('initial_connect', (data) => addLog(`Initial WS connect data: ${JSON.stringify(data)}`));
      wsClient.off('namespace_connected', () => addLog('Namespace connected.'));
    };
  }, [addLog]);

  return {
    isConnected,
    isConnecting,
    logs,
    addLog,
    connect,
    disconnect,
  };
};