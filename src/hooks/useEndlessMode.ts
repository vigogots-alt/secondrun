import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { getFormattedUTCTime } from '@/utils/time'; // Import the new utility

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
  const submissionsRef = useRef(submissions); // Create a ref for submissions
  const [endlessDelay, setEndlessDelay] = useState(1.0);
  const [scoreMultiplier, setScoreMultiplier] = useState(22);
  const [gameId, setGameId] = useState(7);
  const [targetVip, setTargetVip] = useState(0);

  const latestVipCoin = useRef(vipCoin);
  useEffect(() => {
    latestVipCoin.current = vipCoin;
  }, [vipCoin]);

  // Update the submissions ref whenever submissions state changes
  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  // Use a ref for the interval ID to manage it across renders
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref to hold the latest `isRunning` state without being a dependency of `runSubmission`
  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const runSubmission = useCallback(async () => {
    // Use the ref for isRunning here
    if (!isConnected || !isRunningRef.current) {
      // If not connected or stopped externally, clear interval
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      return;
    }

    let currentScore: number;
    let currentSyncState: boolean;

    // Use the current 'submissions' value from the ref
    const currentIndex = submissionsRef.current; // <-- Access submissions via ref

    // Logic for specific scores and syncState based on index
    if (currentIndex === 0 || currentIndex === 1) {
      currentScore = 0;
      currentSyncState = (currentIndex % 2 === 0);
    } else if (currentIndex === 2) {
      currentScore = 9;
      currentSyncState = (currentIndex % 2 === 0);
    } else if (currentIndex === 3) {
      currentScore = 22;
      currentSyncState = true;
    } else {
      currentScore = (currentIndex + 1) * scoreMultiplier + Math.floor(Math.random() * 21) - 10;
      currentSyncState = (currentIndex % 2 === 0);
    }

    const ftn = "0";
    const indexTime = getFormattedUTCTime();
    
    await submitGameScore(currentScore, currentIndex, ftn, currentSyncState, indexTime);
    
    setSubmissions(prev => {
      const newSubmissions = prev + 1;
      if (newSubmissions >= 43) {
        addLog('Reached 43 submissions, ending game and restarting round...');
        endGame();
        startGame(gameId);
        return 0; // Reset index for the new round
      }
      return newSubmissions;
    });

    if (targetVip > 0 && latestVipCoin.current >= targetVip) {
      setIsRunning(false); // This will update the `isRunning` state, which `isRunningRef` will pick up
      toast.success(`Target VIP ${targetVip} reached!`);
    }
  }, [isConnected, scoreMultiplier, targetVip, addLog, startGame, submitGameScore, endGame, latestVipCoin, gameId]); // `isRunning` removed from dependencies

  useEffect(() => {
    if (isRunning && isConnected) {
      addLog('Starting endless score submission interval...');
      // Clear any existing interval before setting a new one
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);

      // Initial run immediately
      runSubmission();
      intervalIdRef.current = setInterval(runSubmission, (endlessDelay * 1000) + (Math.random() * 400 - 200));
    } else {
      addLog('Stopping endless score submission interval.');
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, [isRunning, isConnected, endlessDelay, runSubmission]);

  const startEndless = useCallback(async () => {
    if (!isConnected || isRunning) {
      toast.warning('Not connected or endless mode already running.');
      return;
    }
    setIsRunning(true);
    setSubmissions(0); // Ensure submissions (and thus index) starts from 0
    addLog('Starting endless score submission...');
    toast.info('Endless score submission started.');
    await startGame(gameId);
  }, [isConnected, isRunning, addLog, startGame, gameId]);

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