import React, { useState } from 'react';
import { useGameeFlowAnalyzer } from '@/hooks/useGameeFlowAnalyzer';
import MadeWithDyad from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConnectionControls } from '@/components/ConnectionControls';
import { AnalyzerTabs } from '@/components/AnalyzerTabs';
import { ActionPanels } from '@/components/ActionPanels';

const GameeFlowAnalyzerPage = () => {
  const {
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
    startEndless,
    stopEndless,
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
    collect22Coins,
  } = useGameeFlowAnalyzer();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handlePlayerSelect = (id: string) => {
    setSelectedPlayerId(id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-primary-foreground">Gamee Flow Analyzer</h1>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
        {/* Left Panel: Connection and Controls */}
        <ConnectionControls
          isConnected={isConnected}
          isConnecting={isConnecting}
          isRefreshing={isRefreshing}
          credentials={credentials}
          setCredentials={setCredentials}
          connect={connect}
          disconnect={disconnect}
          refreshLeaderboards={refreshLeaderboards}
          autoRefresh={autoRefresh}
          toggleAutoRefresh={toggleAutoRefresh}
          playerId={playerId}
          vipCoin={vipCoin}
          chips={chips}
          ftnBalance={ftnBalance}
        />

        {/* Middle Panel: Endless Mode and Other Actions */}
        <ActionPanels
          isConnected={isConnected}
          vipCoin={vipCoin}
          chips={chips}
          ftnBalance={ftnBalance}
          credentials={credentials}
          setCredentials={setCredentials} // Pass setCredentials
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
          startGame={startGame}
          submitGameScore={submitGameScore}
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
          getRate={getRate}
          swapTransactions={swapTransactions}
          collectBonus={collectBonus}
          payoutFtn={payoutFtn}
          collect22Coins={collect22Coins}
        />

        {/* Right Panel: Tabs for Leaderboards, Changes, History, Log */}
        <div className="col-span-1 lg:col-span-2">
          <AnalyzerTabs
            leaderboardIds={leaderboardIds}
            leaderboardData={leaderboardData}
            changes={changes}
            playerHistory={playerHistory}
            logs={logs}
            selectedPlayerId={selectedPlayerId}
            handlePlayerSelect={handlePlayerSelect}
          />
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default GameeFlowAnalyzerPage;