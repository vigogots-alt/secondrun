import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useGameActions } from './useGameActions'; // Updated import
import { useAuthAndBalance } from './useAuthAndBalance';
import { useWebSocketConnection } from './useWebSocketConnection';

export const useEndlessMode = () => {
  const { isConnected, addLog } = useWebSocketConnection();
  const { sessionToken, vipCoin, chips, ftnBalance } = useAuthAndBalance({ addLog });

  const [isRunning, setIsRunning] = useState(false);
  const [submissions, setSubmissions] = useState(0);
  const [endlessDelay, setEndlessDelay] = useState(1.0);
  const [scoreMultiplier, setScoreMultiplier] = useState(22);
  const [gameId, setGameId] = useState(7); // Changed to number
  const [targetVip, setTargetVip] = useState(0);
  const endlessSubmissionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get game actions from useGameActions hook
  // Note: useEndlessMode needs its own instance of useGameActions,
  // but it needs to pass the correct leaderboardIds if it were to call collect22Coins.
  // For submitGameScore, it just needs the basic props.
  const {
    startGame,
    submitGameScore, // This is the updated submitGameScore
    endGame,
  } = useGameActions({
    isConnected,
    sessionToken,
    vipCoin,
    chips,
    ftnBalance,
    addLog,
    gameId,
    leaderboardIds: [], // Pass an empty array or specific IDs if needed by endless mode
  });

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

    let i = 0;
    endlessSubmissionIntervalRef.current = setInterval(async () => {
      if (!isRunning) { // Check again inside interval to handle external stop
        clearInterval(endlessSubmissionIntervalRef.current!);
        endlessSubmissionIntervalRef.current = null;
        return;
      }

      const score = (i + 1) * scoreMultiplier + Math.floor(Math.random() * 21) - 10; // Random variation
      const ftn = String(Math.min(i, 22)); // User's requested ftn generation, keep as string

      const now = new Date();
      const indexTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const syncState = (i % 2 === 0); // Original logic for syncState in endless mode

      await submitGameScore(score, i, ftn, syncState, indexTime); // Updated call with new parameters
      setSubmissions(prev => {
        const newSubmissions = prev + 1;
        if (newSubmissions >= 43) { // User's requested end of round logic
          addLog('Reached 43 submissions, ending game and restarting round...');
          endGame(); // Call the actual endGame action
          startGame(); // Start a new game session for the next round
          return 0; // Reset index for the new round
        }
        return newSubmissions;
      });
      i++;

      if (targetVip > 0 && vipCoin >= targetVip) {
        stopEndless();
        toast.success(`Target VIP ${targetVip} reached!`);
      }
    }, (endlessDelay * 1000) + (Math.random() * 400 - 200)); // Jittered delay
  }, [isConnected, isRunning, endlessDelay, scoreMultiplier, gameId, targetVip, vipCoin, addLog, startGame, submitGameScore, endGame]);

  const stopEndless = useCallback(() => {
    setIsRunning(false);
    if (endlessSubmissionIntervalRef.current) {
      clearInterval(endlessSubmissionIntervalRef.current);
      endlessSubmissionIntervalRef.current = null;
    }
    addLog('Endless submission stopped.');
    toast.info('Endless score submission stopped.');
  }, [addLog]);

  // Cleanup interval on unmount or if isRunning becomes false externally
  useEffect(() => {
    return () => {
      if (endlessSubmissionIntervalRef.current) {
        clearInterval(endlessSubmissionIntervalRef.current);
      }
    };
  }, []);

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