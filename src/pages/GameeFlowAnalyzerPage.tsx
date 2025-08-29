import React, { useState } from 'react';
import { useGameeFlowAnalyzer } from '@/hooks/useGameeFlowAnalyzer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Loader2 } from 'lucide-react';
import { EndlessModeControls } from '@/components/EndlessModeControls';
import { FinancialActions } from '@/components/FinancialActions';
import { OtherActions } from '@/components/OtherActions';
import { ConnectionControls } from '@/components/ConnectionControls'; // Import new component

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
  const [withdrawalAmount, setWithdrawalAmount] = useState(credentials.withdrawal_amount);
  const [withdrawalFastexId, setWithdrawalFastexId] = useState(credentials.fastex_user_id);
  const [withdrawalFtnAddress, setWithdrawalFtnAddress] = useState(credentials.ftn_address);

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
            withdrawalAmount={withdrawalAmount}
            setWithdrawalAmount={setWithdrawalAmount}
            withdrawalFastexId={withdrawalFastexId}
            setWithdrawalFastexId={setWithdrawalFastexId}
            withdrawalFtnAddress={withdrawalFtnAddress}
            setWithdrawalFtnAddress={setWithdrawalFtnAddress}
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
          <Tabs defaultValue={`lb-${leaderboardIds[0]}`} className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 bg-muted text-muted-foreground">
              {leaderboardIds.map((id) => (
                <TabsTrigger key={id} value={`lb-${id}`} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  LB {id}
                </TabsTrigger>
              ))}
              <TabsTrigger value="changes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Changes</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">History</TabsTrigger>
              <TabsTrigger value="log" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Log</TabsTrigger>
            </TabsList>

            <div className="mt-4 flex-grow">
              {leaderboardIds.map((id) => (
                <TabsContent key={id} value={`lb-${id}`} className="h-full">
                  <Card className="h-full bg-card text-card-foreground border-border shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">Leaderboard {id} {leaderboardData[id]?.lb?.name ? `(${leaderboardData[id].lb.name})` : ''}</CardTitle>
                      {leaderboardData[id] && <p className="text-sm text-muted-foreground">Last updated: {leaderboardData[id].timestamp}</p>}
                    </CardHeader>
                    <CardContent className="h-[calc(100%-100px)]">
                      <ScrollArea className="h-full w-full rounded-md border bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">Rank</TableHead>
                              <TableHead>ID</TableHead>
                              <TableHead>NickName</TableHead>
                              <TableHead>Level</TableHead>
                              <TableHead>XP</TableHead>
                              <TableHead>Points</TableHead>
                              <TableHead>Chips</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaderboardData[id]?.players.length > 0 ? (
                              leaderboardData[id].players.map((player) => (
                                <TableRow key={player.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handlePlayerSelect(player.id)}>
                                  <TableCell className="font-medium">{player.rank}</TableCell>
                                  <TableCell>{player.id}</TableCell>
                                  <TableCell>{player.nickName}</TableCell>
                                  <TableCell>{player.level}</TableCell>
                                  <TableCell>{player.xp}</TableCell>
                                  <TableCell>{player.points}</TableCell>
                                  <TableCell>{player.chips}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                  No data available. Connect and refresh.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}

              <TabsContent value="changes" className="h-full">
                <Card className="h-full bg-card text-card-foreground border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Leaderboard Changes</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-80px)]">
                    <ScrollArea className="h-full w-full rounded-md border bg-background p-4 font-mono text-sm">
                      {changes.length > 0 ? (
                        changes.map((change, index) => (
                          <p key={index} className="mb-1">{change}</p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No changes detected yet.</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="h-full">
                <Card className="h-full bg-card text-card-foreground border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Player History</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-80px)] flex">
                    <ScrollArea className="w-1/3 border-r pr-4 bg-background rounded-l-md">
                      <ul className="space-y-1">
                        {Object.entries(playerHistory).length > 0 ? (
                          Object.entries(playerHistory).map(([id, history]) => (
                            <li
                              key={id}
                              className={`p-2 rounded-md cursor-pointer hover:bg-muted ${selectedPlayerId === id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                              onClick={() => handlePlayerSelect(id)}
                            >
                              {history[0]?.nickName || 'Unknown'} (ID: {id})
                            </li>
                          ))
                        ) : (
                          <p className="text-muted-foreground p-2">No player history yet.</p>
                        )}
                      </ul>
                    </ScrollArea>
                    <ScrollArea className="w-2/3 pl-4 bg-background rounded-r-md">
                      {selectedPlayerId && playerHistory[selectedPlayerId] ? (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">History for Player: {playerHistory[selectedPlayerId][0]?.nickName || selectedPlayerId}</h3>
                          {playerHistory[selectedPlayerId].map((entry, index) => (
                            <p key={index} className="mb-1 text-sm font-mono">
                              {entry.time}: Pts={entry.points}, Chips={entry.chips}, Lvl={entry.level}, XP={entry.xp}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Select a player to view their history.</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="log" className="h-full">
                <Card className="h-full bg-card text-card-foreground border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">WebSocket Log</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-80px)]">
                    <ScrollArea className="h-full w-full rounded-md border bg-background p-4 font-mono text-sm">
                      {logs.length > 0 ? (
                        logs.map((log, index) => (
                          <p key={index} className="mb-1">{log}</p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No log messages yet.</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default GameeFlowAnalyzerPage;