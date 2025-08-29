import { useState, useEffect, useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';

interface Credentials {
  login: string;
  password: string;
  fastex_user_id: string;
  ftn_address: string;
  withdrawal_amount: string;
}

interface UseAuthAndBalanceProps {
  isConnected: boolean;
  addLog: (message: string) => void;
}

interface UseAuthAndBalanceResult {
  credentials: Credentials;
  setCredentials: (credentials: Credentials) => void;
  sessionToken: string | null;
  playerId: string | null;
  vipCoin: number;
  chips: number;
  ftnBalance: number;
  authenticate: () => Promise<boolean>;
  resetAuthAndBalance: () => void;
}

export const useAuthAndBalance = ({ isConnected, addLog }: UseAuthAndBalanceProps): UseAuthAndBalanceResult => {
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

  const resetAuthAndBalance = useCallback(() => {
    setSessionToken(null);
    setPlayerId(null);
    setVipCoin(0);
    setChips(0);
    setFtnBalance(0);
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      addLog('Not connected. Cannot authenticate.');
      toast.warning('Not connected. Please connect first.');
      return false;
    }
    addLog('Attempting authentication...');
    try {
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
      const response = await wsClient.sendMessage('auth', authPayload, true);
      if (response?.eventType === 'auth') {
        const user = response.payload?.user || {};
        setSessionToken(user.token);
        setPlayerId(user.playerId);
        setVipCoin(parseFloat(user.vipCoin || '0'));
        setChips(parseFloat(user.chips || '0'));
        setFtnBalance(parseFloat(user.ftnBalance || '0'));
        addLog(`✅ Authenticated as ${user.playerId}. Chips: ${user.chips}, VIP: ${user.vipCoin}, FTN: ${user.ftnBalance}`);
        toast.success(`Authenticated as ${user.playerId}`);
        return true;
      } else if (response?.eventType === 'error') {
        addLog(`❌ Authentication error: ${JSON.stringify(response.payload)}`);
        toast.error(`Authentication failed: ${JSON.stringify(response.payload?.error || response.payload)}`);
        resetAuthAndBalance();
        return false;
      } else {
        addLog(`📩 Unexpected auth response: ${JSON.stringify(response)}`);
        toast.error('Authentication failed with unexpected response.');
        resetAuthAndBalance();
        return false;
      }
    } catch (error) {
      addLog(`Authentication failed: ${error}`);
      toast.error('Failed to authenticate.');
      resetAuthAndBalance();
      return false;
    }
  }, [isConnected, credentials, addLog, resetAuthAndBalance]);

  useEffect(() => {
    const handleAuthMessage = (payload: any) => {
      const user = payload?.user || {};
      setSessionToken(user.token);
      setPlayerId(user.playerId);
      setVipCoin(parseFloat(user.vipCoin || '0'));
      setChips(parseFloat(user.chips || '0'));
      setFtnBalance(parseFloat(user.ftnBalance || '0'));
      addLog(`✅ Authenticated as ${user.playerId}. Chips: ${user.chips}, VIP: ${user.vipCoin}, FTN: ${user.ftnBalance}`);
      toast.success(`Authenticated as ${user.playerId}`);
    };

    const handleProfileUpdateMessage = (payload: any) => {
      const profile = payload?.profile || {};
      setChips(parseFloat(profile.chips || chips));
      setVipCoin(parseFloat(profile.vipCoin || vipCoin));
      setFtnBalance(parseFloat(profile.ftnBalance || ftnBalance));
      addLog(`🔄 Balance update: Chips=${profile.chips}, VIP=${profile.vipCoin}, FTN=${profile.ftnBalance}`);
    };

    wsClient.on('auth', handleAuthMessage);
    wsClient.on('profileUpdate', handleProfileUpdateMessage);

    return () => {
      wsClient.off('auth', handleAuthMessage);
      wsClient.off('profileUpdate', handleProfileUpdateMessage);
    };
  }, [addLog, chips, vipCoin, ftnBalance]);

  return {
    credentials,
    setCredentials,
    sessionToken,
    playerId,
    vipCoin,
    chips,
    ftnBalance,
    authenticate,
    resetAuthAndBalance,
  };
};