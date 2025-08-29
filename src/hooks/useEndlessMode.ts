import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface UseEndlessModeProps {
  isConnected: boolean;
  sessionToken: string | null;
  vipCoin: number;
  addLog: (message: string) => void;
  startGame: () => Promise<void>;
  submitGameScore: (score: number, index: number, ftn: string) => Promise<void>;
}

export const useEndlessMode = ({
  isConnected,
  sessionToken,
  vipCoin,
  addLog,
  startGame,
  submitGameScore,
}: UseEndlessModeProps) => {
  const [endlessRunning, setEndlessRunning] = useState(false);
  const [endlessDelay, setEndlessDelay] = useState(1.0);
  const [scoreMultiplier, setScoreMultiplier] = useState(10);
  const [gameId, setGameId] = useState(7);
  const [endlessCount, setEndlessCount] = useState(0);
  const [targetVip, setTargetVip] = useState(0);
  const endlessSubmissionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startEndlessSubmission = useCallback(async () => {
    if (!isConnected || endlessRunning) {
      toast.warning('Not connected or endless mode already running.');
      return;
    }
    setEndlessRunning(true);
    setEndlessCount(0);
    addLog('Starting endless score submission...');
    toast.info('Endless score submission started.');

    await startGame(); // Start game session first

    let i = 0;
    endlessSubmissionIntervalRef.current = setInterval(async () => {
      if (!endlessRunning) { // Check again inside interval to handle external stop
        clearInterval(endlessSubmissionIntervalRef.current!);
        endlessSubmissionIntervalRef.current = null;
        return;
      }

      const score = (i + 1) * scoreMultiplier + Math.floor(Math.random() * 21) - 10; // Random variation
      const ftn = String(Math.floor((i + 1) / 2) + Math.floor(Math.random() * 2)); // Slight variation

      await submitGameScore(score, i, ftn);
      setEndlessCount(prev => prev + 1);
      i++;

      if (targetVip > 0 && vipCoin >= targetVip) {
        stopEndlessSubmission();
        toast.success(`Target VIP ${targetVip} reached!`);
      }
    }, (endlessDelay * 1000) + (Math.random() * 400 - 200)); // Jittered delay
  }, [isConnected, endlessRunning, endlessDelay, scoreMultiplier, gameId, targetVip, vipCoin, addLog, startGame, submitGameScore]);

  const stopEndlessSubmission = useCallback(() => {
    setEndlessRunning(false);
    if (endlessSubmissionIntervalRef.current) {
      clearInterval(endlessSubmissionIntervalRef.current);
      endlessSubmissionIntervalRef.current = null;
    }
    addLog('Endless submission stopped.');
    toast.info('Endless score submission stopped.');
  }, [addLog]);

  // Cleanup interval on unmount or if endlessRunning becomes false externally
  useEffect(() => {
    return () => {
      if (endlessSubmissionIntervalRef.current) {
        clearInterval(endlessSubmissionIntervalRef.current);
      }
    };
  }, []);

  return {
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
  };
};