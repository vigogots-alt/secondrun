import React, { useState } from 'react';
import { useGameeFlowAnalyzer } from '@/hooks/useGameeFlowAnalyzer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Loader2 } from 'lucide-react';
import { wsClient } from '@/lib/api'; // Import wsClient

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
  const [customRequestName, setCustomRequestName] = useState('');
  const [customRequestData, setCustomRequestData] = useState('');
  const [swapAmount, setSwapAmount] = useState('1.0');
  const [swapCurrency, setSwapCurrency] = useState('FTN');
  const [bonusId, setBonusId] = useState(1);
  const [withdrawalAmount, setWithdrawalAmount] = useState(credentials.withdrawal_amount);
  const [withdrawalFastexId, setWithdrawalFastexId] = useState(credentials.fastex_user_id);
  const [withdrawalFtnAddress, setWithdrawalFtnAddress] = useState(credentials.ftn_address);

  const handlePlayerSelect = (id: string) => {
    setSelectedPlayerId(id);
  };

  const handleCustomAction = async () => {
    if (!isConnected) {
      alert('Not connected. Please connect first.');
      return;
    }
    try {
      const data = customRequestData ? JSON.parse(customRequestData) : null;
      await wsClient.sendMessage('action', { request: customRequestName, data: data });
      alert('Custom action sent!');
    } catch (e) {
      alert('Error sending custom action or invalid JSON: ' + e);
    }
  };

  const handleSwap = async () => {
    await swapTransactions(swapAmount, swapCurrency);
  };

  const handleCollectBonus = async () => {
    await collectBonus(bonusId);
  };

  const handlePayoutFtn = async () => {
    await payoutFtn(withdrawalAmount, withdrawalFastexId, withdrawalFtnAddress);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-primary-foreground">Gamee Flow Analyzer</h1>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
        {/* Left Panel: Connection and Controls */}
        <Card className="col-span-1 bg-card text-card-foreground border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Button onClick={connect} disabled={isConnected || isConnecting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
              <Button onClick={disconnect} disabled={!isConnected} variant="destructive" className="w-full">
                Disconnect
              </Button>
            </div>
            <Separator />
            <div className="flex flex-col space-y-2">
              <Button onClick={refreshLeaderboards} disabled={!isConnected || isRefreshing} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isRefreshing ? "Refresh Leaderboards" : "Refresh Leaderboards"}
              </Button>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={toggleAutoRefresh}
                  disabled={!isConnected}
                />
                <Label htmlFor="auto-refresh" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Auto Refresh (10s)
                </Label>
              </div>
            </div>
            <Separator />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  Edit Credentials
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
                <DialogHeader>
                  <DialogTitle>Edit Credentials</DialogTitle>
                  <DialogDescription>
                    Update your login credentials for the WebSocket connection.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="login" className="text-right">Login</Label>
                    <Input id="login" value={credentials.login} onChange={(e) => setCredentials({ ...credentials, login: e.target.value })} className="col-span-3 bg-input text-foreground border-border" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">Password</Label>
                    <Input id="password" type="password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} className="col-span-3 bg-input text-foreground border-border" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fastex_user_id" className="text-right">Fastex User ID</Label>
                    <Input id="fastex_user_id" value={credentials.fastex_user_id} onChange={(e) => setCredentials({ ...credentials, fastex_user_id: e.target.value })} className="col-span-3 bg-input text-foreground border-border" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ftn_address" className="text-right">FTN Address</Label>
                    <Input id="ftn_address" value={credentials.ftn_address} onChange={(e) => setCredentials({ ...credentials, ftn_address: e.target.value })} className="col-span-3 bg-input text-foreground border-border" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="withdrawal_amount" className="text-right">Withdrawal Amount</Label>
                    <Input id="withdrawal_amount" value={credentials.withdrawal_amount} onChange={(e) => setCredentials({ ...credentials, withdrawal_amount: e.target.value })} className="col-span-3 bg-input text-foreground border-border" />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <div className="text-sm text-muted-foreground mt-4">
              Status: <span className={isConnected ? "text-green-500" : "text-red-500"}>{isConnected ? "Connected" : "Disconnected"}</span>
              {playerId && <p>Player ID: {playerId}</p>}
              <p>Chips: {chips}</p>
              <p>VIP Coin: {vipCoin}</p>
              <p>FTN Balance: {ftnBalance}</p>
            </div>
          </CardContent>
        </Card>

        {/* Middle Panel: Endless Mode and Other Actions */}
        <div className="col-span-1 lg:col-span-1 flex flex-col gap-6">
          <Card className="bg-card text-card-foreground border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Endless Mode (Unity 3D)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Label htmlFor="endless-delay">Delay (s)</Label>
                <Input id="endless-delay" type="number" value={endlessDelay} onChange={(e) => setEndlessDelay(parseFloat(e.target.value))} disabled={endlessRunning || !isConnected} />

                <Label htmlFor="score-multiplier">Score Multiplier</Label>
                <Input id="score-multiplier" type="number" value={scoreMultiplier} onChange={(e) => setScoreMultiplier(parseInt(e.target.value))} disabled={endlessRunning || !isConnected} />

                <Label htmlFor="game-id">Game ID</Label>
                <Input id="game-id" type="number" value={gameId} onChange={(e) => setGameId(parseInt(e.target.value))} disabled={endlessRunning || !isConnected} />

                <Label htmlFor="target-vip">Target VIP</Label>
                <Input id="target-vip" type="number" value={targetVip} onChange={(e) => setTargetVip(parseInt(e.target.value))} disabled={endlessRunning || !isConnected} />
              </div>
              <Button onClick={startEndlessSubmission} disabled={endlessRunning || !isConnected} className="w-full bg-green-600 hover:bg-green-700 text-white">
                {endlessRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {endlessRunning ? "Running..." : "Start Endless"}
              </Button>
              <Button onClick={stopEndlessSubmission} disabled={!endlessRunning} variant="destructive" className="w-full">
                Stop Endless
              </Button>
              <p className="text-sm text-muted-foreground">Submissions: {endlessCount}</p>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Financial Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={getRate} disabled={!isConnected} className="w-full">Get Rate</Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button disabled={!isConnected} className="w-full">Swap Transactions</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
                  <DialogHeader>
                    <DialogTitle>Swap Transactions</DialogTitle>
                    <DialogDescription>Specify amount and currency to swap.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="swap-amount" className="text-right">Amount</Label>
                      <Input id="swap-amount" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="swap-currency" className="text-right">Currency</Label>
                      <Input id="swap-currency" value={swapCurrency} onChange={(e) => setSwapCurrency(e.target.value)} className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleSwap}>Swap</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button disabled={!isConnected} className="w-full">Collect Bonus</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
                  <DialogHeader>
                    <DialogTitle>Collect Bonus</DialogTitle>
                    <DialogDescription>Enter the bonus ID to collect.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="bonus-id" className="text-right">Bonus ID</Label>
                      <Input id="bonus-id" type="number" value={bonusId} onChange={(e) => setBonusId(parseInt(e.target.value))} className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleCollectBonus}>Collect</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button disabled={!isConnected} className="w-full">Withdraw FTN</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
                  <DialogHeader>
                    <DialogTitle>Withdraw FTN</DialogTitle>
                    <DialogDescription>Enter withdrawal details.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="withdrawal-amount" className="text-right">Amount</Label>
                      <Input id="withdrawal-amount" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="withdrawal-fastex-id" className="text-right">Fastex User ID</Label>
                      <Input id="withdrawal-fastex-id" value={withdrawalFastexId} onChange={(e) => setWithdrawalFastexId(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="withdrawal-ftn-address" className="text-right">FTN Address</Label>
                      <Input id="withdrawal-ftn-address" value={withdrawalFtnAddress} onChange={(e) => setWithdrawalFtnAddress(e.target.value)} className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handlePayoutFtn}>Withdraw</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Other Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => submitGameScore(100, 0, "0")} disabled={!isConnected} className="w-full">Submit Sample Score</Button>
              <Button onClick={startGame} disabled={!isConnected} className="w-full">Start Game</Button>
              <Button onClick={gameCrash} disabled={!isConnected} className="w-full">Game Crash</Button>
              <Button onClick={endGame} disabled={!isConnected} className="w-full">End Game</Button>
              <Button onClick={updateSession} disabled={!isConnected} className="w-full">Update Session</Button>
              <Button onClick={getLevels} disabled={!isConnected} className="w-full">Get Levels</Button>
              <Button onClick={getUpgrades} disabled={!isConnected} className="w-full">Get Upgrades</Button>
              <Button onClick={getFriends} disabled={!isConnected} className="w-full">Get Friends</Button>
              <Button onClick={getFriendRequests} disabled={!isConnected} className="w-full">Get Friend Requests</Button>
              <Button onClick={getUserNotification} disabled={!isConnected} className="w-full">Get User Notifications</Button>
              <Button onClick={userListForFriend} disabled={!isConnected} className="w-full">Get User List for Friends</Button>
              <Button onClick={deleteAccount} disabled={!isConnected} variant="destructive" className="w-full">Delete Account</Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button disabled={!isConnected} className="w-full">Custom Action</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground border-border">
                  <DialogHeader>
                    <DialogTitle>Custom Action</DialogTitle>
                    <DialogDescription>Send a custom WebSocket action.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="custom-request-name" className="text-right">Request Name</Label>
                      <Input id="custom-request-name" value={customRequestName} onChange={(e) => setCustomRequestName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="custom-request-data" className="text-right pt-2">Data (JSON)</Label>
                      <textarea id="custom-request-data" value={customRequestData} onChange={(e) => setCustomRequestData(e.target.value)} className="col-span-3 min-h-[150px] p-2 border rounded-md bg-input text-foreground" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleCustomAction}>Send Custom Action</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
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