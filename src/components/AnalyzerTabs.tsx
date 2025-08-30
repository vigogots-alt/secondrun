import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlayerHistoryChart } from './PlayerHistoryChart'; // Import the new chart component

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

interface AnalyzerTabsProps {
  leaderboardIds: number[];
  leaderboardData: Record<number, LeaderboardData>;
  changes: string[];
  playerHistory: Record<string, PlayerHistoryEntry[]>;
  logs: string[];
  selectedPlayerId: string | null;
  handlePlayerSelect: (id: string) => void;
}

export const AnalyzerTabs: React.FC<AnalyzerTabsProps> = ({
  leaderboardIds,
  leaderboardData,
  changes,
  playerHistory,
  logs,
  selectedPlayerId,
  handlePlayerSelect,
}) => {
  return (
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
            <CardContent className="h-[calc(100%-80px)] flex flex-col lg:flex-row"> {/* Adjusted for chart */}
              <ScrollArea className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r pr-4 pb-4 lg:pb-0 bg-background rounded-t-md lg:rounded-l-md lg:rounded-tr-none">
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
              <div className="w-full lg:w-2/3 pl-0 lg:pl-4 pt-4 lg:pt-0 bg-background rounded-b-md lg:rounded-r-md lg:rounded-bl-none flex flex-col">
                {selectedPlayerId && playerHistory[selectedPlayerId] ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">History for Player: {playerHistory[selectedPlayerId][0]?.nickName || selectedPlayerId}</h3>
                    <div className="flex-grow">
                      <PlayerHistoryChart history={playerHistory[selectedPlayerId]} />
                    </div>
                    <ScrollArea className="h-40 mt-4 border-t pt-4"> {/* Added scroll for detailed text history */}
                      {playerHistory[selectedPlayerId].map((entry, index) => (
                        <p key={index} className="mb-1 text-sm font-mono">
                          {entry.time}: Pts={entry.points}, Chips={entry.chips}, Lvl={entry.level}, XP={entry.xp}
                        </p>
                      ))}
                    </ScrollArea>
                  </>
                ) : (
                  <p className="text-muted-foreground p-2">Select a player to view their history and chart.</p>
                )}
              </div>
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
  );
};