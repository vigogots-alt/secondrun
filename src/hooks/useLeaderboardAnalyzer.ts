import { useState, useEffect, useRef, useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';

interface Player {
  id: string;
  nickName: string;
  level: number;
  xp: number;
  points: number;
  chips: number;
  rank?: number;
}

interface Leaderboard {
  id: number;
  name: string;
  // Add other leaderboard properties if needed
}

interface LeaderboardData {
  lb: Leaderboard;
  players: Player[];
  timestamp: string;
}

interface PlayerHistoryEntry {
  time: string;
  points: number;
  chips: number;
  level: number;
  xp: number;
  nickName: string;
}

interface Credentials {
  login: string;
  password: string;
}

export const useLeaderboardAnalyzer = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false); // New loading state
  const [isRefreshing, setIsRefreshing] = useState(false); // New loading state
  const [logs, setLogs] = useState<string[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<number, LeaderboardData>>({});
  const [previousLeaderboardData, setPreviousLeaderboardData] = useState<Record<number, Player[]>>({});
  const [changes, setChanges] = useState<string[]>([]);
  const [playerHistory, setPlayerHistory] = useState<Record<string, PlayerHistoryEntry[]>>({});
  const [credentials, setCredentials] = useState<Credentials>({ login: 'bver', password: 'bver' });
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const leaderboardIds = [21, 18, 19, 20]; // Daily, Weekly, Monthly, Global

  const addLog = useCallback((message: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const timestamp = `${time}.${milliseconds}`;
    setLogs((prev) => [...prev, `${timestamp} ${message}`]);
  }, []);

  const updateLeaderboardData = useCallback((lbId: number, lb: Leaderboard, players: Player[], timestamp: string) => {
    setLeaderboardData((prev) => ({
      ...prev,
      [lbId]: { lb, players: players.map((p, idx) => ({ ...p, rank: idx + 1 })), timestamp },
    }));
  }, []);

  const detectChanges = useCallback((lbId: number, newPlayers: Player[]) => {
    setPreviousLeaderboardData((prev) => {
      const prevPlayers = prev[lbId] || [];
      const currentChanges: string[] = [];
      const newDict = new Map(newPlayers.map((p) => [p.id, p]));
      const prevDict = new Map(prevPlayers.map((p) => [p.id, p]));

      newPlayers.forEach((newP, newRank) => {
        const oldP = prevDict.get(newP.id);
        if (!oldP) {
          currentChanges.push(`[LB ${lbId}] New player: ${newP.nickName} (ID: ${newP.id}) at rank ${newRank + 1}`);
        } else {
          if (newP.points !== oldP.points) {
            const delta = newP.points - oldP.points;
            currentChanges.push(`[LB ${lbId}] ${newP.nickName}: Points changed by ${delta > 0 ? '+' : ''}${delta}`);
          }
          if (newP.chips !== oldP.chips) {
            const deltaChips = newP.chips - oldP.chips;
            currentChanges.push(`[LB ${lbId}] ${newP.nickName}: Chips changed by ${deltaChips > 0 ? '+' : ''}${deltaChips}`);
          }
          const oldRank = prevPlayers.findIndex(p => p.id === newP.id);
          if (oldRank !== -1 && newRank !== oldRank) {
            currentChanges.push(`[LB ${lbId}] ${newP.nickName}: Rank changed from ${oldRank + 1} to ${newRank + 1}`);
          }
        }
      });

      prevPlayers.forEach((oldP) => {
        if (!newDict.has(oldP.id)) {
          currentChanges.push(`[LB ${lbId}] Player left leaderboard: ${oldP.nickName} (ID: ${oldP.id})`);
        }
      });

      if (currentChanges.length > 0) {
        setChanges((prevChanges) => [
          ...prevChanges,
          `--- Changes in LB ${lbId} (${new Date().toLocaleTimeString()}) ---`,
          ...currentChanges,
          '', // Add a blank line for separation
        ]);
      }
      return { ...prev, [lbId]: newPlayers };
    });
  }, []);

  const updatePlayerHistory = useCallback((players: Player[], timestamp: string) => {
    setPlayerHistory((prevHistory) => {
      const newHistory = { ...prevHistory };
      players.forEach((p) => {
        const pid = p.id;
        if (!newHistory[pid]) {
          newHistory[pid] = [];
        }
        const entry: PlayerHistoryEntry = {
          time: timestamp,
          points: p.points,
          chips: p.chips,
          level: p.level,
          xp: p.xp,
          nickName: p.nickName,
        };
        // Only add if different from the last entry
        if (newHistory[pid].length === 0 || JSON.stringify(newHistory[pid][newHistory[pid].length - 1]) !== JSON.stringify(entry)) {
          newHistory[pid].push(entry);
        }
      });
      return newHistory;
    });
  }, []);

  const refreshLeaderboards = useCallback(async () => {
    if (!isConnected) {
      addLog('Not connected. Cannot refresh leaderboards.');
      toast.warning('Not connected. Please connect first.');
      return;
    }
    setIsRefreshing(true); // Set loading state
    addLog('Refreshing leaderboards...');
    try {
      await wsClient.sendMessage('action', { request: 'getLeaderBoard', data: null });
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay

      for (const lbId of leaderboardIds) {
        await wsClient.sendMessage('action', { request: 'getLeaderBoardPlayers', data: { leaderBoardId: lbId } });
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
      }
      toast.success('Leaderboards refreshed.');
    } catch (error) {
      addLog(`Failed to refresh leaderboards: ${error}`);
      toast.error('Failed to refresh leaderboards.');
    } finally {
      setIsRefreshing(false); // Clear loading state
    }
  }, [isConnected, addLog, leaderboardIds]);

  const handleWsMessage = useCallback(async ({ eventType, payload }: { msgId: string, eventType: string, payload: any }) => {
    if (eventType === 'auth') {
      const user = payload?.user || {};
      setSessionToken(user.token);
      setPlayerId(user.playerId);
      addLog(`✅ Authenticated as ${user.playerId}`);
      toast.success(`Authenticated as ${user.playerId}`);
      await refreshLeaderboards(); // Refresh after successful auth
    } else if (eventType === 'getLeaderBoard') {
      const leaderBoardsList = payload?.leaderBoards || [];
      addLog(`Received list of leaderboards: ${leaderBoardsList.map((lb: any) => lb.name).join(', ')}`);
    } else if (eventType === 'leaderboard') {
      const lb = payload?.leaderBoard || {};
      // Parse player data to numbers
      const players = (payload?.players || []).map((p: any) => ({
        ...p,
        level: parseFloat(p.level || '0'),
        xp: parseFloat(p.xp || '0'),
        points: parseFloat(p.points || '0'),
        chips: parseFloat(p.chips || '0'),
      }));
      const lbId = parseInt(lb.id);
      const timestamp = new Date().toLocaleString();

      updateLeaderboardData(lbId, lb, players, timestamp);
      detectChanges(lbId, players);
      updatePlayerHistory(players, timestamp);
    } else if (eventType === 'error') {
      addLog(`❌ Error: ${JSON.stringify(payload?.error)}`);
      toast.error(`Error: ${JSON.stringify(payload?.error)}`);
    } else {
      addLog(`📩 Unhandled event '${eventType}': ${JSON.stringify(payload)}`);
    }
  }, [addLog, refreshLeaderboards, updateLeaderboardData, detectChanges, updatePlayerHistory]);

  const connect = useCallback(async () => {
    setIsConnecting(true); // Set loading state
    addLog('Connecting...');
    try {
      await wsClient.connect();

      await new Promise<void>((resolve) => {
        const onNamespaceConnected = () => {
          wsClient.off('namespace_connected', onNamespaceConnected);
          resolve();
        };
        wsClient.on('namespace_connected', onNamespaceConnected);
      });

      const authPayload = {
        login: credentials.login,
        password: credentials.password,
        userName: null,
        provider: 1,
        versionNumber: "2.1.5",
        udid: "2587809A-796B-4E35-AA69-176F8AD0974F",
        platform: 0,
        language: 0,
        logInType: 0,
        guestToken: null
      };
      await wsClient.sendMessage('auth', authPayload);
    } catch (error) {
      addLog(`Connection failed: ${error}`);
      toast.error('Failed to connect to WebSocket.');
    } finally {
      setIsConnecting(false); // Clear loading state
    }
  }, [addLog, credentials]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
    setSessionToken(null);
    setPlayerId(null);
    setAutoRefresh(false);
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    addLog('Disconnected.');
    toast.info('Disconnected from WebSocket.');
  }, [addLog]);

  useEffect(() => {
    wsClient.on('log', addLog);
    wsClient.on('status', setIsConnected);
    wsClient.on('message', handleWsMessage);
    wsClient.on('error', (err) => addLog(`WS Error: ${err}`));
    wsClient.on('initial_connect', (data) => addLog(`Initial WS connect data: ${JSON.stringify(data)}`));

    return () => {
      wsClient.off('log', addLog);
      wsClient.off('status', setIsConnected);
      wsClient.off('message', handleWsMessage);
      wsClient.off('error', (err) => addLog(`WS Error: ${err}`));
      wsClient.off('initial_connect', (data) => addLog(`Initial WS connect data: ${JSON.stringify(data)}`));
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [addLog, handleWsMessage]);

  useEffect(() => {
    if (autoRefresh && isConnected) {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      autoRefreshIntervalRef.current = setInterval(() => {
        refreshLeaderboards();
      }, 10000); // 10 seconds
    } else if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, isConnected, refreshLeaderboards]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  return {
    isConnected,
    isConnecting, // Export new state
    isRefreshing, // Export new state
    logs,
    leaderboardData,
    changes,
    playerHistory,
    credentials,
    setCredentials,
    connect,
    disconnect,
    refreshLeaderboards,
    autoRefresh,
    toggleAutoRefresh,
    leaderboardIds,
    sessionToken,
    playerId,
  };
};