import { useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';
import { generateSha256Hash } from '@/utils/crypto';

interface UseGameActionsProps {
  isConnected: boolean;
  sessionToken: string | null;
  vipCoin: number;
  chips: number;
  ftnBalance: number;
  addLog: (message: string) => void;
  gameId: number;
  leaderboardIds: number[]; // Add leaderboardIds here
}

export const useGameActions = ({
  isConnected,
  sessionToken,
  vipCoin,
  chips,
  ftnBalance,
  addLog,
  gameId,
  leaderboardIds, // Destructure leaderboardIds
}: UseGameActionsProps) => {

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

  // Modified submitGameScore to accept syncState and indexTime
  const submitGameScore = useCallback(async (score: number, index: number, ftn: string, syncState: boolean, indexTime: string) => {
    if (!isConnected || !sessionToken) {
      addLog('Submit Game Score: Not connected or not authenticated. Aborting.');
      toast.warning('Not connected or not authenticated.');
      return;
    }
    addLog(`Submit Game Score: Attempting to submit score: ${score}, index: ${index}, ftn: ${ftn}, syncState: ${syncState}, indexTime: ${indexTime}`);
    try {
      let currentStartScore = vipCoin;

      // Hash generation as per user's example: startScore + index + score + ftn + sessionToken
      const dataToHash = `${currentStartScore}${index}${score}${ftn}`;
      let currentHash = await generateSha256Hash(dataToHash, sessionToken || undefined); // Pass sessionToken as secret

      let scoreData = {
        startScore: currentStartScore,
        index: index,
        indexTime: indexTime, // Use provided indexTime
        syncState: syncState, // Use provided syncState
        hash: currentHash,
        ftn: ftn, // Send ftn as string "0"
        score: score
      };

      addLog(`Submit Game Score: Sending scoreData: ${JSON.stringify(scoreData)}`);
      let response = await wsClient.sendMessage('action', { request: 'gameScore', data: scoreData }, true);
      addLog(`Submit Game Score: Received initial response: ${JSON.stringify(response)}`);

      // Check for error code 33 first for retry logic
      if (response?.payload?.error?.code === 33) {
        addLog('Submit Game Score: Received error code 33, retrying with updated startScore...');
        // Get updated VIP coin for the retry
        currentStartScore = vipCoin; // vipCoin is a state, so it will reflect the latest value
        const retryDataToHash = `${currentStartScore}${index}${score}${ftn}`;
        currentHash = await generateSha256Hash(retryDataToHash, sessionToken || undefined); // Pass sessionToken as secret
        scoreData = { // Recreate scoreData with updated values
          ...scoreData,
          startScore: currentStartScore,
          hash: currentHash,
        };
        
        addLog(`Submit Game Score: Retrying with updated scoreData: ${JSON.stringify(scoreData)}`);
        // Attempt retry
        response = await wsClient.sendMessage('action', { request: 'gameScore', data: scoreData }, true);
        addLog(`Submit Game Score: Received retry response: ${JSON.stringify(response)}`);
      }

      // After initial attempt or retry, check if there's an error in the payload
      if (response?.payload?.error) {
        addLog(`Submit Game Score: Failed to submit score: ${JSON.stringify(response.payload.error)}`);
        toast.error(`Failed to submit score: ${JSON.stringify(response.payload.error?.message || response.payload.error)}`);
      } else {
        addLog(`Submit Game Score: Successfully submitted score ${score}.`);
        toast.success(`Score ${score} submitted.`);
      }

    } catch (error) {
      addLog(`Submit Game Score: An unexpected error occurred: ${error}`);
      toast.error('Failed to submit score due to an unexpected error.');
    }
  }, [isConnected, sessionToken, vipCoin, addLog]); // Added vipCoin to dependencies

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

  // New function to collect 22 coins with the specified sequence
  const collect22Coins = useCallback(async () => {
    if (!isConnected || !sessionToken) {
        toast.warning('Not connected or not authenticated.');
        return;
    }
    addLog('Initiating 22 coins collection sequence...');
    toast.info('Collecting 22 coins...');

    try {
        // 1. Send updateSession
        await updateSession();
        // 2. Send getLevels
        await getLevels();
        // 3. Send getLeaderBoardPlayers for all LBs
        for (const lbId of leaderboardIds) {
            await wsClient.sendMessage('action', { request: 'getLeaderBoardPlayers', data: { leaderBoardId: lbId } });
            addLog(`Requested leaderboard players for LB ${lbId}`);
            await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
        }
        // 4. Send getUpgrades
        await getUpgrades();

        // 5. Send gameScore for 22 coins
        const score = 22;
        const index = 3;
        const ftn = "0"; // As per user's request
        const syncState = true; // As per user's request for index 3

        const now = new Date();
        const indexTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        await submitGameScore(score, index, ftn, syncState, indexTime);
        toast.success('22 coins collection sequence completed.');

    } catch (error) {
        addLog(`Failed to collect 22 coins: ${error}`);
        toast.error('Failed to collect 22 coins.');
    }
  }, [isConnected, sessionToken, vipCoin, addLog, updateSession, getLevels, getUpgrades, submitGameScore, leaderboardIds]);


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
    }
    catch (error) {
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
    addLog(`Swapping ${amount} ${currency} Chips...`);
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

  return {
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
    collect22Coins,
  };
};