import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { wsClient } from '@/lib/api';
import { toast } from 'sonner';

interface OtherActionsProps {
  isConnected: boolean;
  submitGameScore: (score: number, index: number, ftn: string, syncState: boolean, indexTime: string) => Promise<void>; // Updated signature
  startGame: () => Promise<void>;
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
}

export const OtherActions: React.FC<OtherActionsProps> = ({
  isConnected,
  submitGameScore,
  startGame,
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
}) => {
  const [customRequestName, setCustomRequestName] = useState('');
  const [customRequestData, setCustomRequestData] = useState('');

  // State for custom game score submission
  const [customScore, setCustomScore] = useState(22);
  const [customIndex, setCustomIndex] = useState(3); // Default to 3
  const [customFtn, setCustomFtn] = useState('0'); // Keep as string for input
  const [customSyncState, setCustomSyncState] = useState(true); // Default to true for index 3

  const handleCustomAction = async () => {
    if (!isConnected) {
      toast.warning('Not connected. Please connect first.');
      return;
    }
    try {
      const data = customRequestData ? JSON.parse(customRequestData) : null;
      await wsClient.sendMessage('action', { request: customRequestName, data: data });
      toast.success('Custom action sent!');
    } catch (e) {
      toast.error('Error sending custom action or invalid JSON: ' + e);
    }
  };

  const handleCustomScoreSubmission = async () => {
    if (!isConnected) {
      toast.warning('Not connected. Please connect first.');
      return;
    }
    const now = new Date();
    // Use UTC methods for GMT 0
    const indexTime = `${String(now.getUTCDate()).padStart(2, '0')}.${String(now.getUTCMonth() + 1).padStart(2, '0')}.${now.getUTCFullYear()} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
    await submitGameScore(customScore, customIndex, customFtn, customSyncState, indexTime);
  };

  return (
    <Card className="bg-card text-card-foreground border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Other Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* New button for collecting 22 coins */}
        <Button onClick={collect22Coins} disabled={!isConnected} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
          Collect 22 Coins (Index 3)
        </Button>
        
        {/* Updated sample score button to use syncState: true */}
        <Button onClick={() => {
          const now = new Date();
          const sampleIndexTime = `${String(now.getUTCDate()).padStart(2, '0')}.${String(now.getUTCMonth() + 1).padStart(2, '0')}.${now.getUTCFullYear()} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
          submitGameScore(100, 0, "0", true, sampleIndexTime);
        }} disabled={!isConnected} className="w-full">Submit Sample Score</Button>
        
        {/* Section for custom game score submission */}
        <div className="pt-4 border-t border-border mt-4">
          <h3 className="text-lg font-semibold mb-2">Custom Game Score Submission</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Label htmlFor="custom-score">Score</Label>
            <Input
              id="custom-score"
              type="number"
              value={customScore}
              onChange={(e) => setCustomScore(parseInt(e.target.value))}
              disabled={!isConnected}
              className="bg-input text-foreground border-border"
            />
            <Label htmlFor="custom-index">Index</Label>
            <Input
              id="custom-index"
              type="number"
              value={customIndex}
              onChange={(e) => setCustomIndex(parseInt(e.target.value))}
              disabled={!isConnected}
              className="bg-input text-foreground border-border"
            />
            <Label htmlFor="custom-ftn">FTN (string)</Label>
            <Input
              id="custom-ftn"
              type="text"
              value={customFtn}
              onChange={(e) => setCustomFtn(e.target.value)}
              disabled={!isConnected}
              className="bg-input text-foreground border-border"
            />
            <Label htmlFor="custom-sync-state">Sync State</Label>
            <input
              id="custom-sync-state"
              type="checkbox"
              checked={customSyncState}
              onChange={(e) => setCustomSyncState(e.target.checked)}
              disabled={!isConnected}
              className="col-span-1 mt-2"
            />
          </div>
          <Button onClick={handleCustomScoreSubmission} disabled={!isConnected} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Submit Custom Score
          </Button>
        </div>
        {/* End custom score section */}

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
                <Input id="custom-request-name" value={customRequestName} onChange={(e) => setCustomRequestName(e.target.value)} className="col-span-3 bg-input text-foreground border-border" />
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
  );
};