import { useState, useCallback } from 'react';

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

export const useLeaderboardData = (addLog: (message: string) => void) => {
  const [leaderboardData, setLeaderboardData] = useState<Record<number, LeaderboardData>>({});
  const [previousLeaderboardData, setPreviousLeaderboardData] = useState<Record<number, Player[]>>({});
  const [changes, setChanges] = useState<string[]>([]);
  const [playerHistory, setPlayerHistory] = useState<Record<string, PlayerHistoryEntry[]>>({});

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

  return {
    leaderboardData,
    changes,
    playerHistory,
    updateLeaderboardData,
    detectChanges,
    updatePlayerHistory,
    setChanges, // Expose setter to allow clearing changes on disconnect
    setPlayerHistory, // Expose setter to allow clearing history on disconnect
  };
};