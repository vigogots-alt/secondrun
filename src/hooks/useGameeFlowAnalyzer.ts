import { useState, useEffect, useRef, useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';
import { useLeaderboardData } from './useLeaderboardData';
import { useEndlessMode } from './useEndlessMode';
import { useGameActions } from './useGameActions';
import { useWebSocketConnection } from './useWebSocketConnection';
import { useAuthAndBalance } from './useAuthAndBalance';

export const useGameeFlowAnalyzer = () => {
  const {
    isConnected,
    isConnecting,
    logs,
    addLog,
    connect: wsConnect,
    disconnect: wsDisconnect,
  } = useWebSocketConnection();

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
  } = useAuthAndBalance({ addLog }); // Removed isConnected from props

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const leaderboardIds = [21, 18, 19, 20];

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

  const {
    startGame: gameActionsStartGame,
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
    gameId: 7,
  });

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
    startGame: gameActionsStartGame,
    submitGameScore,
  });

  const refreshLeaderboards = useCallback(async () => {
    // Используем wsClient.isConnected напрямую для немедленной проверки
    if (!wsClient.isConnected) {
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
  }, [addLog, leaderboardIds]);

  const connect = useCallback(async () => {
    const wsConnected = await wsConnect(); // Получаем статус подключения
    if (wsConnected) {
      const authSuccess = await authenticate();
      if (authSuccess) {
        await refreshLeaderboards();
      }
    }
  }, [wsConnect, authenticate, refreshLeaderboards]);

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

  // Specific handlers for events relevant to GameeFlowAnalyzer
  const handleLeaderboardEvent = useCallback((payload: any) => {
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
  }, [addLog, updateLeaderboardData, detectChanges, updatePlayerHistory]);

  const handleGetLeaderBoardListEvent = useCallback((payload: any) => {
    const leaderBoardsList = payload?.leaderBoards || [];
    addLog(`Received list of leaderboards: ${leaderBoardsList.map((lb: any) => lb.name || lb.id).join(', ')}`);
  }, [addLog]);

  const handleGenericErrorEvent = useCallback((payload: any) => {
    addLog(`❌ Error: ${JSON.stringify(payload?.error || payload)}`);
    toast.error(`Error: ${JSON.stringify(payload?.error || payload)}`);
  }, [addLog]);

  // Effect for setting up WebSocket listeners
  useEffect(() => {
    wsClient.on('leaderboard', handleLeaderboardEvent);
    wsClient.on('getLeaderBoard', handleGetLeaderBoardListEvent);
    wsClient.on('error', handleGenericErrorEvent);

    return () => {
      wsClient.off('leaderboard', handleLeaderboardEvent);
      wsClient.off('getLeaderBoard', handleGetLeaderBoardListEvent);
      wsClient.off('error', handleGenericErrorEvent);
    };
  }, [handleLeaderboardEvent, handleGetLeaderBoardListEvent, handleGenericErrorEvent]);

  useEffect(() => {
    if (autoRefresh && wsClient.isConnected) { // Используем wsClient.isConnected
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      autoRefreshIntervalRef.current = setInterval(() => {
        refreshLeaderboards();
      }, 10000);
    } else if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshLeaderboards]); // Удален isConnected из зависимостей

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
    leaderboardData,
    changes,
    playerHistory,
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
    startGame: gameActionsStartGame,
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