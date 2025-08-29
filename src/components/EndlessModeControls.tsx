import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface EndlessModeControlsProps {
  isConnected: boolean;
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
  startEndlessSubmission: () => void;
  stopEndlessSubmission: () => void;
}

export const EndlessModeControls: React.FC<EndlessModeControlsProps> = ({
  isConnected,
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
}) => {
  return (
    <Card className="bg-card text-card-foreground border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Endless Mode (Unity 3D)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Label htmlFor="endless-delay">Delay (s)</Label>
          <Input
            id="endless-delay"
            type="number"
            value={endlessDelay}
            onChange={(e) => setEndlessDelay(parseFloat(e.target.value))}
            disabled={endlessRunning || !isConnected}
            className="bg-input text-foreground border-border"
          />

          <Label htmlFor="score-multiplier">Score Multiplier</Label>
          <Input
            id="score-multiplier"
            type="number"
            value={scoreMultiplier}
            onChange={(e) => setScoreMultiplier(parseInt(e.target.value))}
            disabled={endlessRunning || !isConnected}
            className="bg-input text-foreground border-border"
          />

          <Label htmlFor="game-id">Game ID</Label>
          <Input
            id="game-id"
            type="number"
            value={gameId}
            onChange={(e) => setGameId(parseInt(e.target.value))}
            disabled={endlessRunning || !isConnected}
            className="bg-input text-foreground border-border"
          />

          <Label htmlFor="target-vip">Target VIP</Label>
          <Input
            id="target-vip"
            type="number"
            value={targetVip}
            onChange={(e) => setTargetVip(parseInt(e.target.value))}
            disabled={endlessRunning || !isConnected}
            className="bg-input text-foreground border-border"
          />
        </div>
        <Button
          onClick={startEndlessSubmission}
          disabled={endlessRunning || !isConnected}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {endlessRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {endlessRunning ? "Running..." : "Start Endless"}
        </Button>
        <Button
          onClick={stopEndlessSubmission}
          disabled={!endlessRunning}
          variant="destructive"
          className="w-full"
        >
          Stop Endless
        </Button>
        <p className="text-sm text-muted-foreground">Submissions: {endlessCount}</p>
      </CardContent>
    </Card>
  );
};