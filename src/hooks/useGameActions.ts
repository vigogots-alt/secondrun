import { useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';
import { generateSha256Hash } from '@/utils/crypto';
import { getFormattedUTCTime } from '@/utils/time'; // Import the new utility

interface UseGameActionsProps {
  isConnected: boolean;
  sessionToken: string | null;
  vipCoin: number;
  chips: number;
  ftnBalance: number;
  addLog: (message: string) => void;
  defaultGameId: number; // Renamed from gameId to defaultGameId to clarify
  leaderboardIds: number[];
}

export const useGameActions = ({
  isConnected,
  sessionToken,
  vipCoin,
  chips,
  ftnBalance,
  addLog,
  defaultGameId, // Use defaultGameId
  leaderboardIds,
}: UseGameActionsProps) => {

  const startGame = useCallback(async (overrideGameId?: number) => { // Added optional overrideGameId
    const currentGameObjectId = overrideGameId !== undefined ? overrideGameId : defaultGameId; // Use override or default
    if (!isConnected || !sessionToken) {
      toast.warning('Not connected or not authenticated.');
      return;
    }
    addLog(`Starting game ${currentGameObjectId}...`);
    try {
      await wsClient.sendMessage('start_game', {
        sessionToken: sessionToken,
        gameType: "default",
        gameId: currentGameObjectId // Use currentGameObjectId
      });
      toast.success(`Game ${currentGameObjectId} started.`);
    } catch (error) {
      addLog(`Failed to start game: ${error}`);
      toast.error('Failed to start game.');
    }
  }, [isConnected, sessionToken, defaultGameId, addLog]); // defaultGameId is a dependency

  const submitGameScore = useCallback(async (score: number, index: number, ftn: string, syncState: boolean, indexTime: string) => {
    if (!isConnected || !sessionToken) {
      addLog('Submit Game Score: Not connected or not authenticated. Aborting.');
      toast.warning('Not connected or not authenticated.');
      return;
    }
    addLog(`Submit Game Score: Attempting to submit score: ${score}, index: ${index}, ftn: ${ftn}, syncState: ${syncState}, indexTime: ${indexTime}`);
    try {
      let currentStartScore = vipCoin;

      // Формируем строку для хэша согласно Python-алгоритму
      const syncStateStr = syncState ? 'true' : 'false';
      const dataToHash = `${currentStartScore}${index}${indexTime}${syncStateStr}${ftn}${score}${sessionToken}`;
      let currentHash = await generateSha256Hash(dataToHash);

      let scoreData = {
        startScore: currentStartScore,
        index: index,
        indexTime: indexTime,
        syncState: syncState,
        hash: currentHash,
        ftn: ftn,
        score: score
      };

      addLog(`Submit Game Score: Sending scoreData: ${JSON.stringify(scoreData)}`);
      let response = await wsClient.sendMessage('action', { request: 'gameScore', data: scoreData }, true);
      addLog(`Submit Game Score: Received initial response: ${JSON.stringify(response)}`);

      if (response?.payload?.error?.code === 33) {
        addLog('Submit Game Score: Received error code 33, retrying with updated startScore...');
        currentStartScore = vipCoin;
        const retryDataToHash = `${currentStartScore}${index}${indexTime}${syncStateStr}${ftn}${score}${sessionToken}`;
        currentHash = await generateSha256Hash(retryDataToHash);
        scoreData = {
          ...scoreData,
          startScore: currentStartScore,
          hash: currentHash
        };

        addLog(`Submit Game Score: Retrying with updated scoreData: ${JSON.stringify(scoreData)}`);
        response = await wsClient.sendMessage('action', { request: 'gameScore', data: scoreData }, true);
        addLog(`Submit Game Score: Received retry response: ${JSON.stringify(response)}`);
      }

      if (response?.payload?.error) {
        addLog(`Submit Game Score: Failed to submit score: ${JSON.stringify(response.payload.error)}`);
        toast.error(`Failed to submit score: ${JSON.stringify(response.payload.error?.message || response.payload.error)}`);
      } else {
        addLog(`Submit Game Score: Successfully submitted score ${score}.`);
        toast.success(`Score ${score} submitted.`);
      }
      return response; // Return response for collect22Coins to use
    } catch (error) {
      addLog(`Submit Game Score: An unexpected error occurred: ${error}`);
      toast.error('Failed to submit score due to an unexpected error.');
      throw error; // Re-throw to propagate error in collect22Coins
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

  const collect22Coins = useCallback(async () => {
    if (!isConnected || !sessionToken) {
      toast.warning('Not connected or not authenticated.');
      return;
    }
    if (!vipCoin || vipCoin <= 0) {
      addLog('Invalid vipCoin value. Waiting for profileUpdate...');
      toast.error('Invalid vipCoin. Please wait for profile update.');
      return;
    }
    addLog('Initiating 22 coins collection sequence...');
    toast.info('Collecting 22 coins...');

    try {
      // Подготовка сессии
      await updateSession();
      await new Promise(resolve => setTimeout(resolve, 500));
      await getLevels();
      await new Promise(resolve => setTimeout(resolve, 500));
      for (const lbId of leaderboardIds) {
        await wsClient.sendMessage('action', { request: 'getLeaderBoardPlayers', data: { leaderBoardId: lbId } });
        addLog(`Requested leaderboard players for LB ${lbId}`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      await getUpgrades();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Запуск игры
      await startGame(defaultGameId); // Pass defaultGameId here
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Отправка gameScore для index 0, 1, 2, 3
      const scores = [0, 0, 9, 22];
      const syncStates = [false, true, true, true];
      let currentVipCoin = vipCoin; // Initialize with current vipCoin from state

      for (let i = 0; i <= 3; i++) {
        const score = scores[i];
        const syncState = syncStates[i];
        const ftn = "0";
        const indexTime = getFormattedUTCTime(); // Use the new utility function

        addLog(`Submitting score for index ${i}: score=${score}, syncState=${syncState}`);
        const response = await submitGameScore(score, i, ftn, syncState, indexTime);
        addLog(`Response for index ${i}: ${JSON.stringify(response)}`);

        if (response?.payload?.error) {
          addLog(`Failed at index ${i}: ${JSON.stringify(response.payload.error)}`);
          throw new Error(`Failed at index ${i}: ${response.payload.error.description}`);
        }

        // Обновление currentVipCoin из ответа сервера
        if (response?.payload?.profile?.vipCoin) {
          currentVipCoin = parseFloat(response.payload.profile.vipCoin);
          addLog(`Updated currentVipCoin to ${currentVipCoin} from response.`);
        } else {
          addLog(`No vipCoin in response for index ${i}. currentVipCoin remains ${currentVipCoin}.`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
      }

      toast.success('22 coins collection sequence completed.');
    } catch (error) {
      addLog(`Failed to collect 22 coins: ${error}`);
      toast.error('Failed to collect 22 coins.');
    }
  }, [isConnected, sessionToken, vipCoin, addLog, updateSession, getLevels, getUpgrades, startGame, submitGameScore, leaderboardIds, defaultGameId]);


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