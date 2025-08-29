import { useState, useEffect, useRef, useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';
import { useLeaderboardData } from './useLeaderboardData';
import { useEndlessMode } from './useEndlessMode';
import { useGameActions } from './useGameActions';
import { useWebSocketConnection } from './useWebSocketConnection'; // Import new hook
import { useAuthAndBalance } from './useAuthAndBalance'; // Import new hook

export const useGameeFlowAnalyzer = () => {
  // Use new WebSocket connection hook
  const {
    isConnected,
    isConnecting,
    logs,
    addLog,
    connect: wsConnect, // Rename to avoid conflict with local connect
    disconnect: wsDisconnect, // Rename to avoid conflict with local disconnect
  } = useWebSocketConnection();

  // Use new Auth and Balance hook
  const {
    credentials,
    setCredentials,
    sessionToken,
    playerId,
    vipCoin,
    chips,
    ftnBalance,
    authenticate,
    resetAuthAndBalance,
  } = useAuthAndBalance({ isConnected, addLog });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const leaderboardIds = [21, 18, 19, 20]; // Daily, Weekly, Monthly, Global

  // Use the leaderboard data hook
  const {
    leaderboardData,
    changes,
    playerHistory,
    updateLeaderboardData,
    detectChanges,
    updatePlayerHistory,
    setChanges,
    setPlayerHistory,
  } = useLeaderboardData(addLog);

  // Use the game actions hook
  const {
    startGame: gameActionsStartGame, // Rename to avoid conflict with endless mode's startGame
    submitGameScore,
    gameCrash,
    endGame,
    updateSession,
    getLevels,
    getUpgrades,
    getFriends,
    getFriendRequests,
    getUserNotification,
    userListForFriend,
    deleteAccount,
    getRate,
    swapTransactions,
    collectBonus,
    payoutFtn,
  } = useGameActions({
    isConnected,
    sessionToken,
    vipCoin,
    chips,
    ftnBalance,
    addLog,
    gameId: 7, // Default gameId, will be overridden by endless mode if active
  });

  // Use the endless mode hook
  const {
    endlessRunning,
    endlessDelay,
    setEndlessDelay,
    scoreMultiplier,
    setScoreMultiplier,
    gameId,
    setGameId,
    endlessCount,
    targetVip,
    setTargetVip,
    startEndlessSubmission,
    stopEndlessSubmission,
  } = useEndlessMode({
    isConnected,
    sessionToken,
    vipCoin,
    addLog,
    startGame: gameActionsStartGame, // Pass the startGame from useGameActions
    submitGameScore,
  });

  const refreshLeaderboards = useCallback(async () => {
    if (!isConnected) {
      addLog('Not connected. Cannot refresh leaderboards.');
      toast.warning('Not connected. Please connect first.');
      return;
    }
    setIsRefreshing(true);
    addLog('Refreshing leaderboards...');
    try {
      await wsClient.sendMessage('action', { request: 'getLeaderBoard', data: null });
      await new Promise(resolve => setTimeout(resolve, 500));

      for (const lbId of leaderboardIds) {
        await wsClient.sendMessage('action', { request: 'getLeaderBoardPlayers', data: { leaderBoardId: lbId } });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      toast.success('Leaderboards refreshed.');
    } catch (error) {
      addLog(`Failed to refresh leaderboards: ${error}`);
      toast.error('Failed to refresh leaderboards.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isConnected, addLog, leaderboardIds]);

  // Combined connect function
  const connect = useCallback(async () => {
    await wsConnect();
    if (isConnected) { // Only authenticate if WebSocket connection was successful
      await authenticate();
      await refreshLeaderboards(); // Refresh after successful auth
    }
  }, [wsConnect, authenticate, refreshLeaderboards, isConnected]);

  // Combined disconnect function
  const disconnect = useCallback(() => {
    wsDisconnect();
    resetAuthAndBalance();
    stopEndlessSubmission();
    setChanges([]);
    setPlayerHistory({});

    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
  }, [wsDisconnect, resetAuthAndBalance, stopEndlessSubmission, setChanges, setPlayerHistory]);

  // Handle generic WebSocket messages for leaderboards and errors
  const handleWsMessage = useCallback(async (data: { msgId?: string, eventType: string, payload: any }) => {
    const { eventType, payload } = data;
    if (eventType === 'getLeaderBoard') {
      const leaderBoardsList = payload?.leaderBoards || [];
      addLog(`Received list of leaderboards: ${leaderBoardsList.map((lb: any) => lb.name || lb.id).join(', ')}`);
    } else if (eventType === 'leaderboard') {
      const lb = payload?.leaderboard || {};
      const players = (payload?.players || []).map((p: any) => ({
        ...p,
        level: parseFloat(p.level || '0'),
        xp: parseFloat(p.xp || '0'),
        points: parseFloat(p.score || p.points || '0'),
        chips: parseFloat(p.chips || '0'),
      }));
      const lbId = parseInt(lb.id || payload?.leaderBoardId);
      if (!isNaN(lbId)) {
        updateLeaderboardData(lbId, lb, players, new Date().toLocaleString());
        detectChanges(lbId, players);
        updatePlayerHistory(players, new Date().toLocaleString());
      } else {
        addLog(`📩 Leaderboard data received but could not determine ID: ${JSON.stringify(payload)}`);
      }
    } else if (eventType === 'error') {
      addLog(`❌ Error: ${JSON.stringify(payload?.error || payload)}`);
      toast.error(`Error: ${JSON.stringify(payload?.error || payload)}`);
    } else if (eventType === 'ack') {
      addLog(`ACK received for message ID ${data.msgId}`);
    } else {
      // Only log unhandled events if they are not auth or profileUpdate (handled by useAuthAndBalance)
      if (!['auth', 'profileUpdate'].includes(eventType)) {
        addLog(`📩 Unhandled event '${eventType}': ${JSON.stringify(payload)}`);
      }
    }
  }, [addLog, updateLeaderboardData, detectChanges, updatePlayerHistory]);

  useEffect(() => {
    wsClient.on('message', handleWsMessage);
    wsClient.on('getLeaderBoard', (payload) => handleWsMessage({ eventType: 'getLeaderBoard', payload }));
    wsClient.on('leaderboard', (payload) => handleWsMessage({ eventType: 'leaderboard', payload }));
    wsClient.on('getRate', (payload) => handleWsMessage({ eventType: 'getRate', payload }));
    wsClient.on('getLevels', (payload) => handleWsMessage({ eventType: 'getLevels', payload }));
    wsClient.on('getUpgrades', (payload) => handleWsMessage({ eventType: 'getUpgrades', payload }));
    wsClient.on('getFriends', (payload) => handleWsMessage({ eventType: 'getFriends', payload }));
    wsClient.on('getFriendRequests', (payload) => handleWsMessage({ eventType: 'getFriendRequests', payload }));
    wsClient.on('getUserNotification', (payload) => handleWsMessage({ eventType: 'getUserNotification', payload }));
    wsClient.on('userListForFriend', (payload) => handleWsMessage({ eventType: 'userListForFriend', payload }));
    wsClient.on('deleteAccount', (payload) => handleWsMessage({ eventType: 'deleteAccount', payload }));
    wsClient.on('swapTransactions', (payload) => handleWsMessage({ eventType: 'swapTransactions', payload }));
    wsClient.on('collectBonus', (payload) => handleWsMessage({ eventType: 'collectBonus', payload }));
    wsClient.on('payoutFTN', (payload) => handleWsMessage({ eventType: 'payoutFTN', payload }));
    wsClient.on('error', (payload) => handleWsMessage({ eventType: 'error', payload }));

    return () => {
      wsClient.off('message', handleWsMessage);
      wsClient.off('getLeaderBoard', (payload) => handleWsMessage({ eventType: 'getLeaderBoard', payload }));
      wsClient.off('leaderboard', (payload) => handleWsMessage({ eventType: 'leaderboard', payload }));
      wsClient.off('getRate', (payload) => handleWsMessage({ eventType: 'getRate', payload }));
      wsClient.off('getLevels', (payload) => handleWsMessage({ eventType: 'getLevels', payload }));
      wsClient.off('getUpgrades', (payload) => handleWsMessage({ eventType: 'getUpgrades', payload }));
      wsClient.off('getFriends', (payload) => handleWsMessage({ eventType: 'getFriends', payload }));
      wsClient.off('getFriendRequests', (payload) => handleWsMessage({ eventType: 'getFriendRequests', payload }));
      wsClient.off('getUserNotification', (payload) => handleWsMessage({ eventType: 'getUserNotification', payload }));
      wsClient.off('userListForFriend', (payload) => handleWsMessage({ eventType: 'userListForFriend', payload }));
      wsClient.off('deleteAccount', (payload) => handleWsMessage({ eventType: 'deleteAccount', payload }));
      wsClient.off('swapTransactions', (payload) => handleWsMessage({ eventType: 'swapTransactions', payload }));
      wsClient.off('collectBonus', (payload) => handleWsMessage({ eventType: 'collectBonus', payload }));
      wsClient.off('payoutFTN', (payload) => handleWsMessage({ eventType: 'payoutFTN', payload }));
      wsClient.off('error', (payload) => handleWsMessage({ eventType: 'error', payload }));
    };
  }, [handleWsMessage]);

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
    isConnecting,
    isRefreshing,
    logs,
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
    vipCoin,
    chips,
    ftnBalance,
    // From useLeaderboardData
    leaderboardData,
    changes,
    playerHistory,
    // From useEndlessMode
    endlessRunning,
    endlessDelay,
    setEndlessDelay,
    scoreMultiplier,
    setScoreMultiplier,
    gameId,
    setGameId,
    endlessCount,
    targetVip,
    setTargetVip,
    startEndlessSubmission,
    stopEndlessSubmission,
    // Core Actions (now from useGameActions)
    startGame: gameActionsStartGame, // Export the renamed startGame
    submitGameScore,
    gameCrash,
    endGame,
    updateSession,
    getLevels,
    getUpgrades,
    getFriends,
    getFriendRequests,
    getUserNotification,
    userListForFriend,
    deleteAccount,
    getRate,
    swapTransactions,
    collectBonus,
    payoutFtn,
  };
};