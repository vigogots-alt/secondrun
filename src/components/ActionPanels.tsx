import React from 'react';
import { EndlessModeControls } from '@/components/EndlessModeControls';
import { FinancialActions } from '@/components/FinancialActions';
import { OtherActions } from '@/components/OtherActions';

interface ActionPanelsProps {
  isConnected: boolean;
  vipCoin: number;
  chips: number;
  ftnBalance: number;
  credentials: {
    login: string;
    password: string;
    fastex_user_id: string;
    ftn_address: string;
    withdrawal_amount: string;
  };
  // Endless Mode Props (now directly from useEndlessMode)
  endlessRunning: boolean;
  endlessDelay: number;
  setEndlessDelay: (delay: number) => void;
  scoreMultiplier: number;
  setScoreMultiplier: (multiplier: number) => void;
  gameId: number;
  setGameId: (id: number) => void;
  endlessCount: number;
  targetVip: number;
  setTargetVip: (vip: number) => void;
  startEndless: () => void;
  stopEndless: () => void;
  // Game Actions Props
  startGame: () => Promise<void>;
  submitGameScore: (score: number, index: number, ftn: string, syncState: boolean, indexTime: string) => Promise<void>; // Updated signature
  gameCrash: () => Promise<void>;
  endGame: () => Promise<void>;
  updateSession: () => Promise<void>;
  getLevels: () => Promise<void>;
  getUpgrades: () => Promise<void>;
  getFriends: () => Promise<void>;
  getFriendRequests: () => Promise<void>;
  getUserNotification: () => Promise<void>;
  userListForFriend: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  collect22Coins: () => Promise<void>; // New prop
  // Financial Actions Props
  getRate: () => Promise<void>;
  swapTransactions: (amount: string, currency: string) => Promise<void>;
  collectBonus: (bonusId: number) => Promise<void>;
  payoutFtn: (amount: string, fastexUserId: string, ftnAddress: string) => Promise<void>;
}

export const ActionPanels: React.FC<ActionPanelsProps> = ({
  isConnected,
  vipCoin,
  chips,
  ftnBalance,
  credentials,
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
  startEndless,
  stopEndless,
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
  collect22Coins, // Destructure new prop
  getRate,
  swapTransactions,
  collectBonus,
  payoutFtn,
}) => {
  return (
    <div className="col-span-1 lg:col-span-1 flex flex-col gap-6">
      <EndlessModeControls
        isConnected={isConnected}
        endlessRunning={endlessRunning}
        endlessDelay={endlessDelay}
        setEndlessDelay={setEndlessDelay}
        scoreMultiplier={scoreMultiplier}
        setScoreMultiplier={setScoreMultiplier}
        gameId={gameId}
        setGameId={setGameId}
        endlessCount={endlessCount}
        targetVip={targetVip}
        setTargetVip={setTargetVip}
        startEndless={startEndless}
        stopEndless={stopEndless}
      />

      <FinancialActions
        isConnected={isConnected}
        getRate={getRate}
        swapTransactions={swapTransactions}
        collectBonus={collectBonus}
        payoutFtn={payoutFtn}
        credentials={credentials}
      />

      <OtherActions
        isConnected={isConnected}
        submitGameScore={submitGameScore}
        startGame={startGame}
        gameCrash={gameCrash}
        endGame={endGame}
        updateSession={updateSession}
        getLevels={getLevels}
        getUpgrades={getUpgrades}
        getFriends={getFriends}
        getFriendRequests={getFriendRequests}
        getUserNotification={getUserNotification}
        userListForFriend={userListForFriend}
        deleteAccount={deleteAccount}
        collect22Coins={collect22Coins} // Pass the new function
      />
    </div>
  );
};