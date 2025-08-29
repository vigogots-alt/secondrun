import { useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';
import { generateSha256Hash } from '@/utils/crypto'; // Import from new utility

interface UseGameActionsProps {
  isConnected: boolean;
  sessionToken: string | null;
  vipCoin: number;
  chips: number;
  ftnBalance: number;
  addLog: (message: string) => void;
  gameId: number; // Assuming gameId is needed for startGame
}

export const useGameActions = ({
  isConnected,
  sessionToken,
  vipCoin,
  chips,
  ftnBalance,
  addLog,
  gameId,
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
  };
};