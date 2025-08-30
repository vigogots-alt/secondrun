import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UseEndlessModeProps {
  isConnected: boolean;
  addLog: (message: string) => void;
  vipCoin: number; // Still needed for target VIP logic
  startGame: (gameId?: number) => Promise<void>; // Updated signature
  submitGameScore: (score: number, index: number, ftn: string, syncState: boolean, indexTime: string) => Promise<any>;
  endGame: () => Promise<void>;
}

export const useEndlessMode = ({
  isConnected,
  addLog,
  vipCoin,
  startGame,
  submitGameScore,
  endGame,
}: UseEndlessModeProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [submissions, setSubmissions] = useState(0);
  const [endlessDelay, setEndlessDelay] = useState(1.0);
  const [scoreMultiplier, setScoreMultiplier] = useState(22);
  const [gameId, setGameId] = useState(7); // This gameId is for the endless mode itself, not the one passed to useGameActions
  const [targetVip, setTargetVip] = useState(0);

  // Use a ref to hold the latest vipCoin for the interval callback
  const latestVipCoin = useRef(vipCoin);
  useEffect(() => {
    latestVipCoin.current = vipCoin;
  }, [vipCoin]);

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
      // Use UTC methods for GMT 0
      const indexTime = `${String(now.getUTCDate()).padStart(2, '0')}.${String(now.getUTCMonth() + 1).padStart(2, '0')}.${now.getUTCFullYear()} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
      
      await submitGameScore(currentScore, i, ftn, currentSyncState, indexTime);
      setSubmissions(prev => {
        const newSubmissions = prev + 1;
        if (newSubmissions >= 43) {
          addLog('Reached 43 submissions, ending game and restarting round...');
          endGame();
          startGame(gameId); // Pass gameId here
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
  }, [isRunning, isConnected, endlessDelay, scoreMultiplier, targetVip, addLog, startGame, submitGameScore, endGame, latestVipCoin, gameId]); // Added gameId dependency

  const startEndless = useCallback(async () => {
    if (!isConnected || isRunning) {
      toast.warning('Not connected or endless mode already running.');
      return;
    }
    setIsRunning(true);
    setSubmissions(0);
    addLog('Starting endless score submission...');
    toast.info('Endless score submission started.');
    await startGame(gameId); // Start game session first, passing the gameId
  }, [isConnected, isRunning, addLog, startGame, gameId]); // Added gameId dependency

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
    gameId, // This gameId is managed by useEndlessMode
    setGameId, // This setGameId is managed by useEndlessMode
    targetVip,
    setTargetVip,
    startEndless,
    stopEndless,
  };
};