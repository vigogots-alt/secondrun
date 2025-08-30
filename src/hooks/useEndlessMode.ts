import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useGameActions } from './useGameActions';
import { useAuthAndBalance } from './useAuthAndBalance';
import { useWebSocketConnection } from './useWebSocketConnection';

export const useEndlessMode = () => {
  const { isConnected, addLog } = useWebSocketConnection();
  const { sessionToken, vipCoin, chips, ftnBalance } = useAuthAndBalance({ addLog });

  const [isRunning, setIsRunning] = useState(false);
  const [submissions, setSubmissions] = useState(0);
  const [endlessDelay, setEndlessDelay] = useState(1.0);
  const [scoreMultiplier, setScoreMultiplier] = useState(22);
  const [gameId, setGameId] = useState(7);
  const [targetVip, setTargetVip] = useState(0);

  // Use a ref to hold the latest vipCoin for the interval callback
  const latestVipCoin = useRef(vipCoin);
  useEffect(() => {
    latestVipCoin.current = vipCoin;
  }, [vipCoin]);

  const {
    startGame,
    submitGameScore,
    endGame,
  } = useGameActions({
    isConnected,
    sessionToken,
    vipCoin: latestVipCoin.current, // Pass the ref's current value to useGameActions
    chips,
    ftnBalance,
    addLog,
    gameId,
    leaderboardIds: [],
  });

  // This useEffect will manage the interval for endless submissions
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let i = 0; // Local counter for index within the current endless run

    const runSubmission = async () => {
      if (!isConnected || !isRunning) {
        // If not connected or stopped externally, clear interval
        if (intervalId) clearInterval(intervalId);
        return;
      }

      let currentScore: number;
      let currentSyncState: boolean;

      // Logic for specific scores and syncState based on index
      if (i === 0 || i === 1) {
        currentScore = 0;
        currentSyncState = (i % 2 === 0);
      } else if (i === 2) {
        currentScore = 9;
        currentSyncState = (i % 2 === 0);
      } else if (i === 3) {
        currentScore = 22;
        currentSyncState = true;
      } else {
        currentScore = (i + 1) * scoreMultiplier + Math.floor(Math.random() * 21) - 10;
        currentSyncState = (i % 2 === 0);
      }

      const ftn = "0";
      const now = new Date();
      const indexTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      await submitGameScore(currentScore, i, ftn, currentSyncState, indexTime);
      setSubmissions(prev => {
        const newSubmissions = prev + 1;
        if (newSubmissions >= 43) {
          addLog('Reached 43 submissions, ending game and restarting round...');
          endGame();
          startGame();
          return 0; // Reset index for the new round
        }
        return newSubmissions;
      });
      i++;

      if (targetVip > 0 && latestVipCoin.current >= targetVip) { // Use ref for latest vipCoin
        setIsRunning(false); // Stop the endless mode
        toast.success(`Target VIP ${targetVip} reached!`);
      }
    };

    if (isRunning && isConnected) {
      addLog('Starting endless score submission interval...');
      // Initial run immediately
      runSubmission();
      intervalId = setInterval(runSubmission, (endlessDelay * 1000) + (Math.random() * 400 - 200));
    } else {
      addLog('Stopping endless score submission interval.');
      if (intervalId) clearInterval(intervalId);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, isConnected, endlessDelay, scoreMultiplier, gameId, targetVip, addLog, startGame, submitGameScore, endGame, latestVipCoin]); // Dependencies for useEffect

  const startEndless = useCallback(async () => {
    if (!isConnected || isRunning) {
      toast.warning('Not connected or endless mode already running.');
      return;
    }
    setIsRunning(true);
    setSubmissions(0);
    addLog('Starting endless score submission...');
    toast.info('Endless score submission started.');
    await startGame(); // Start game session first
  }, [isConnected, isRunning, addLog, startGame]);

  const stopEndless = useCallback(() => {
    setIsRunning(false);
    addLog('Endless submission stopped.');
    toast.info('Endless score submission stopped.');
  }, [addLog]);

  return {
    isRunning,
    submissions,
    endlessDelay,
    setEndlessDelay,
    scoreMultiplier,
    setScoreMultiplier,
    gameId,
    setGameId,
    targetVip,
    setTargetVip,
    startEndless,
    stopEndless,
  };
};