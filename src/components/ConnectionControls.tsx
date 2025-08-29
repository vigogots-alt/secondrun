import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface Credentials {
  login: string;
  password: string;
  fastex_user_id: string;
  ftn_address: string;
  withdrawal_amount: string;
}

interface ConnectionControlsProps {
  isConnected: boolean;
  isConnecting: boolean;
  isRefreshing: boolean;
  credentials: Credentials;
  setCredentials: (credentials: Credentials) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshLeaderboards: () => Promise<void>;
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
  playerId: string | null;
  vipCoin: number;
  chips: number;
  ftnBalance: number;
}

export const ConnectionControls: React.FC<ConnectionControlsProps> = ({
  isConnected,
  isConnecting,
  isRefreshing,
  credentials,
  setCredentials,
  connect,
  disconnect,
  refreshLeaderboards,
  autoRefresh,
  toggleAutoRefresh,
  playerId,
  vipCoin,
  chips,
  ftnBalance,
}) => {
  return (
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
  );
};