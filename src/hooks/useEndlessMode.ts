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
  const [gameId, setGameId] = useState(7); // Changed to number
  const [targetVip, setTargetVip] = useState(0);
  const endlessSubmissionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    startGame,
    submitGameScore,
    endGame,
  } = useGameActions({
    isConnected,
    sessionToken,
    vipCoin,
    chips,
    ftnBalance,
    addLog,
    gameId,
    leaderboardIds: [],
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

      let currentScore: number;
      let currentSyncState: boolean;

      // Logic for specific scores and syncState based on index
      if (i === 0 || i === 1) {
        currentScore = 0;
        currentSyncState = (i % 2 === 0); // Keep original logic for 0, 1
      } else if (i === 2) {
        currentScore = 9;
        currentSyncState = (i % 2 === 0); // Keep original logic for 2
      } else if (i === 3) {
        currentScore = 22;
        currentSyncState = true; // Explicitly true for index 3
      } else {
        currentScore = (i + 1) * scoreMultiplier + Math.floor(Math.random() * 21) - 10; // Random variation for other indices
        currentSyncState = (i % 2 === 0); // Keep original logic for other indices
      }

      const ftn = "0"; // User's requested ftn generation, keep as string

      const now = new Date();
      const indexTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      await submitGameScore(currentScore, i, ftn, currentSyncState, indexTime); // Updated call with new parameters
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