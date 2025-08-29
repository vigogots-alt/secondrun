import React, { useState } from 'react';
import { useGameeFlowAnalyzer } from '@/hooks/useGameeFlowAnalyzer';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';
import { EndlessModeControls } from '@/components/EndlessModeControls';
import { FinancialActions } from '@/components/FinancialActions';
import { OtherActions } from '@/components/OtherActions';
import { ConnectionControls } from '@/components/ConnectionControls';
import { AnalyzerTabs } from '@/components/AnalyzerTabs'; // Import new component

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
  } = useGameeFlowAnalyzer();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  // Removed withdrawalAmount, withdrawalFastexId, withdrawalFtnAddress states
  // as they are now managed internally by FinancialActions.

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
            startEndlessSubmission={startEndlessSubmission}
            stopEndlessSubmission={stopEndlessSubmission}
          />

          <FinancialActions
            isConnected={isConnected}
            getRate={getRate}
            swapTransactions={swapTransactions}
            collectBonus={collectBonus}
            payoutFtn={payoutFtn}
            credentials={credentials} // Pass credentials for initialization
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
          />
        </div>

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