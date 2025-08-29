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
  fastex_user_id: string;
  ftn_address: string;
  withdrawal_amount: string;
}

// Utility to generate SHA256 hash
async function generateSha256Hash(data: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const dataBuffer = textEncoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash;
}

export const useGameeFlowAnalyzer = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<number, LeaderboardData>>({});
  const [previousLeaderboardData, setPreviousLeaderboardData] = useState<Record<number, Player[]>>({});
  const [changes, setChanges] = useState<string[]>([]);
  const [playerHistory, setPlayerHistory] = useState<Record<string, PlayerHistoryEntry[]>>({});
  const [credentials, setCredentials] = useState<Credentials>({
    login: 'bver',
    password: 'bver',
    fastex_user_id: '1048344',
    ftn_address: '0xb52D75FF8A14A7BB713E4E3DAB83342F01354b69',
    withdrawal_amount: '5.0'
  });
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [vipCoin, setVipCoin] = useState<number>(0);
  const [chips, setChips] = useState<number>(0);
  const [ftnBalance, setFtnBalance] = useState<number>(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Endless Mode States
  const [endlessRunning, setEndlessRunning] = useState(false);
  const [endlessDelay, setEndlessDelay] = useState(1.0);
  const [scoreMultiplier, setScoreMultiplier] = useState(10);
  const [gameId, setGameId] = useState(7);
  const [endlessCount, setEndlessCount] = useState(0);
  const [targetVip, setTargetVip] = useState(0);
  const endlessSubmissionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleWsMessage = useCallback(async (data: { msgId?: string, eventType: string, payload: any }) => {
    const { eventType, payload } = data;
    if (eventType === 'auth') {
      const user = payload?.user || {};
      setSessionToken(user.token);
      setPlayerId(user.playerId);
      setVipCoin(parseFloat(user.vipCoin || '0'));
      setChips(parseFloat(user.chips || '0'));
      setFtnBalance(parseFloat(user.ftnBalance || '0'));
      addLog(`✅ Authenticated as ${user.playerId}. Chips: ${user.chips}, VIP: ${user.vipCoin}, FTN: ${user.ftnBalance}`);
      toast.success(`Authenticated as ${user.playerId}`);
      await refreshLeaderboards(); // Refresh after successful auth
    } else if (eventType === 'profileUpdate') {
      const profile = payload?.profile || {};
      setChips(parseFloat(profile.chips || chips));
      setVipCoin(parseFloat(profile.vipCoin || vipCoin));
      setFtnBalance(parseFloat(profile.ftnBalance || ftnBalance));
      addLog(`🔄 Balance update: Chips=${profile.chips}, VIP=${profile.vipCoin}, FTN=${profile.ftnBalance}`);
    } else if (eventType === 'getLeaderBoard') {
      const leaderBoardsList = payload?.leaderBoards || [];
      addLog(`Received list of leaderboards: ${leaderBoardsList.map((lb: any) => lb.name || lb.id).join(', ')}`);
    } else if (eventType === 'leaderboard') {
      const lb = payload?.leaderboard || {};
      const players = (payload?.players || []).map((p: any) => ({
        ...p,
        level: parseFloat(p.level || '0'),
        xp: parseFloat(p.xp || '0'),
        points: parseFloat(p.score || p.points || '0'), // Use 'score' if 'points' is not available
        chips: parseFloat(p.chips || '0'),
      }));
      const lbId = parseInt(lb.id || payload?.leaderBoardId); // Handle different payload structures
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
      addLog(`📩 Unhandled event '${eventType}': ${JSON.stringify(payload)}`);
    }
  }, [addLog, refreshLeaderboards, updateLeaderboardData, detectChanges, updatePlayerHistory, chips, vipCoin, ftnBalance]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
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
      await wsClient.sendMessage('auth', authPayload, true); // Wait for auth response
    } catch (error) {
      addLog(`Connection failed: ${error}`);
      toast.error('Failed to connect to WebSocket.');
    } finally {
      setIsConnecting(false);
    }
  }, [addLog, credentials]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
    setSessionToken(null);
    setPlayerId(null);
    setVipCoin(0);
    setChips(0);
    setFtnBalance(0);
    setAutoRefresh(false);
    setEndlessRunning(false);
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    if (endlessSubmissionIntervalRef.current) {
      clearInterval(endlessSubmissionIntervalRef.current);
      endlessSubmissionIntervalRef.current = null;
    }
    addLog('Disconnected.');
    toast.info('Disconnected from WebSocket.');
  }, [addLog]);

  // --- New Action Functions ---

  const startGame = useCallback(async () => {
    if (!isConnected || !sessionToken) {
      toast.warning('Not connected or not authenticated.');
      return;
    }
    addLog(`Starting game ${gameId}...`);
    try {
      await wsClient.sendMessage('start_game', {
        sessionToken: sessionToken,
        gameType: "default",
        gameId: gameId
      });
      toast.success(`Game ${gameId} started.`);
    } catch (error) {
      addLog(`Failed to start game: ${error}`);
      toast.error('Failed to start game.');
    }
  }, [isConnected, sessionToken, gameId, addLog]);

  const submitGameScore = useCallback(async (score: number, index: number, ftn: string) => {
    if (!isConnected || !sessionToken) {
      toast.warning('Not connected or not authenticated.');
      return;
    }
    addLog(`Submitting score: ${score}, index: ${index}, ftn: ${ftn}`);
    try {
      const startScore = vipCoin; // Use current VIP coin as start score
      const hash = await generateSha256Hash(`${startScore}${index}${score}${ftn}`);
      const scoreData = {
        startScore: startScore,
        index: index,
        indexTime: new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        syncState: (index % 2 === 0),
        hash: hash,
        ftn: ftn,
        score: score
      };
      const response = await wsClient.sendMessage('action', { request: 'gameScore', data: scoreData }, true);
      if (response?.eventType === 'error' && response.payload?.code === 33) {
        addLog('Received error code 33, retrying with updated startScore...');
        const newStartScore = vipCoin; // Get updated VIP coin
        const newHash = await generateSha256Hash(`${newStartScore}${index}${score}${ftn}`);
        scoreData.startScore = newStartScore;
        scoreData.hash = newHash;
        await wsClient.sendMessage('action', { request: 'gameScore', data: scoreData }, true);
      }
      toast.success(`Score ${score} submitted.`);
    } catch (error) {
      addLog(`Failed to submit score: ${error}`);
      toast.error('Failed to submit score.');
    }
  }, [isConnected, sessionToken, vipCoin, addLog]);

  const gameCrash = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Sending game crash request...');
    try {
      await wsClient.sendMessage('action', { request: 'gameCrash' });
      toast.info('Game crash request sent.');
    } catch (error) {
      addLog(`Failed to send game crash: ${error}`);
      toast.error('Failed to send game crash.');
    }
  }, [isConnected, addLog]);

  const endGame = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Sending end game request...');
    try {
      await wsClient.sendMessage('action', { request: 'endGame' });
      toast.info('End game request sent.');
    } catch (error) {
      addLog(`Failed to send end game: ${error}`);
      toast.error('Failed to send end game.');
    }
  }, [isConnected, addLog]);

  const updateSession = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Sending update session request...');
    try {
      await wsClient.sendMessage('action', { request: 'updateSession' });
      toast.info('Update session request sent.');
    } catch (error) {
      addLog(`Failed to send update session: ${error}`);
      toast.error('Failed to send update session.');
    }
  }, [isConnected, addLog]);

  const getLevels = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Fetching levels...');
    try {
      await wsClient.sendMessage('action', { request: 'getLevels' });
      toast.info('Levels request sent.');
    } catch (error) {
      addLog(`Failed to get levels: ${error}`);
      toast.error('Failed to get levels.');
    }
  }, [isConnected, addLog]);

  const getUpgrades = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Fetching upgrades...');
    try {
      await wsClient.sendMessage('action', { request: 'getUpgrades', data: { type: 0 } });
      await wsClient.sendMessage('action', { request: 'getUpgrades', data: { type: 1 } });
      toast.info('Upgrades request sent.');
    } catch (error) {
      addLog(`Failed to get upgrades: ${error}`);
      toast.error('Failed to get upgrades.');
    }
  }, [isConnected, addLog]);

  const getFriends = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Fetching friends...');
    try {
      await wsClient.sendMessage('action', { request: 'getFriends' });
      toast.info('Friends request sent.');
    } catch (error) {
      addLog(`Failed to get friends: ${error}`);
      toast.error('Failed to get friends.');
    }
  }, [isConnected, addLog]);

  const getFriendRequests = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Fetching friend requests...');
    try {
      await wsClient.sendMessage('action', { request: 'getFriendRequests' });
      toast.info('Friend requests sent.');
    } catch (error) {
      addLog(`Failed to get friend requests: ${error}`);
      toast.error('Failed to get friend requests.');
    }
  }, [isConnected, addLog]);

  const getUserNotification = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Fetching user notifications...');
    try {
      await wsClient.sendMessage('action', { request: 'getUserNotification' });
      toast.info('User notifications request sent.');
    } catch (error) {
      addLog(`Failed to get user notifications: ${error}`);
      toast.error('Failed to get user notifications.');
    }
  }, [isConnected, addLog]);

  const userListForFriend = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Fetching user list for friends...');
    try {
      await wsClient.sendMessage('action', { request: 'userListForFriend', data: { page: 0 } });
      toast.info('User list for friends request sent.');
    } catch (error) {
      addLog(`Failed to get user list for friends: ${error}`);
      toast.error('Failed to get user list for friends.');
    }
  }, [isConnected, addLog]);

  const deleteAccount = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    if (!confirm("Are you sure you want to delete the account? This action cannot be undone.")) {
      return;
    }
    addLog('Sending delete account request...');
    try {
      await wsClient.sendMessage('action', { request: 'deleteAccount' });
      toast.info('Delete account request sent.');
    } catch (error) {
      addLog(`Failed to delete account: ${error}`);
      toast.error('Failed to delete account.');
    }
  }, [isConnected, addLog]);

  const getRate = useCallback(async () => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog('Fetching rate...');
    try {
      await wsClient.sendMessage('action', { request: 'getRate' });
      toast.info('Rate request sent.');
    } catch (error) {
      addLog(`Failed to get rate: ${error}`);
      toast.error('Failed to get rate.');
    }
  }, [isConnected, addLog]);

  const swapTransactions = useCallback(async (amount: string, currency: string) => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog(`Swapping ${amount} ${currency}...`);
    try {
      await wsClient.sendMessage('action', { request: 'swapTransactions', data: { amount: amount, currency: currency } });
      toast.success('Swap transaction requested.');
    } catch (error) {
      addLog(`Failed to swap transactions: ${error}`);
      toast.error('Failed to swap transactions.');
    }
  }, [isConnected, addLog]);

  const collectBonus = useCallback(async (bonusId: number) => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    addLog(`Collecting bonus with ID ${bonusId}...`);
    try {
      await wsClient.sendMessage('action', { request: 'collectBonus', data: { bonusId: bonusId }, description: null });
      toast.success('Bonus collection requested.');
    } catch (error) {
      addLog(`Failed to collect bonus: ${error}`);
      toast.error('Failed to collect bonus.');
    }
  }, [isConnected, addLog]);

  const payoutFtn = useCallback(async (amount: string, fastexUserId: string, ftnAddress: string) => {
    if (!isConnected) {
      toast.warning('Not connected.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Invalid withdrawal amount.');
      return;
    }
    if (ftnBalance < parsedAmount) {
      toast.error(`Insufficient FTN balance: ${ftnBalance}. Requested: ${parsedAmount}`);
      return;
    }

    addLog(`Withdrawing ${amount} FTN...`);
    try {
      await wsClient.sendMessage('action', {
        request: 'payoutFTN',
        data: {
          amount: amount,
          fastexUserId: fastexUserId,
          ftnAddress: ftnAddress
        }
      });
      toast.success('Withdrawal request submitted.');
    } catch (error) {
      addLog(`Failed to withdraw FTN: ${error}`);
      toast.error('Failed to withdraw FTN.');
    }
  }, [isConnected, ftnBalance, addLog]);

  // Endless Mode Logic
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
      if (!endlessRunning) {
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


  useEffect(() => {
    wsClient.on('log', addLog);
    wsClient.on('status', setIsConnected);
    wsClient.on('message', handleWsMessage); // Listen to generic messages for parsing
    wsClient.on('error', (err) => addLog(`WS Error: ${err}`));
    wsClient.on('initial_connect', (data) => addLog(`Initial WS connect data: ${JSON.stringify(data)}`));
    wsClient.on('namespace_connected', () => addLog('Namespace connected.'));
    wsClient.on('auth', (payload) => handleWsMessage({ eventType: 'auth', payload }));
    wsClient.on('profileUpdate', (payload) => handleWsMessage({ eventType: 'profileUpdate', payload }));
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
      wsClient.off('log', addLog);
      wsClient.off('status', setIsConnected);
      wsClient.off('message', handleWsMessage);
      wsClient.off('error', (err) => addLog(`WS Error: ${err}`));
      wsClient.off('initial_connect', (data) => addLog(`Initial WS connect data: ${JSON.stringify(data)}`));
      wsClient.off('namespace_connected', () => addLog('Namespace connected.'));
      wsClient.off('auth', (payload) => handleWsMessage({ eventType: 'auth', payload }));
      wsClient.off('profileUpdate', (payload) => handleWsMessage({ eventType: 'profileUpdate', payload }));
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

      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      if (endlessSubmissionIntervalRef.current) {
        clearInterval(endlessSubmissionIntervalRef.current);
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
    isConnecting,
    isRefreshing,
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
    vipCoin,
    chips,
    ftnBalance,
    // Endless Mode
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
    // New Actions
    startGame,
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