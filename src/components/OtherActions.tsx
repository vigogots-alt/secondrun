import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { wsClient } from '@/lib/api'; // Import wsClient for custom action

interface OtherActionsProps {
  isConnected: boolean;
  submitGameScore: (score: number, index: number, ftn: string) => Promise<void>;
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
}) => {
  const [customRequestName, setCustomRequestName] = useState('');
  const [customRequestData, setCustomRequestData] = useState('');

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

  return (
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