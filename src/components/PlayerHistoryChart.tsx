import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PlayerHistoryEntry {
  time: string;
  points: number;
  chips: number;
  level: number;
  xp: number;
  nickName: string;
}

interface PlayerHistoryChartProps {
  history: PlayerHistoryEntry[];
}

export const PlayerHistoryChart: React.FC<PlayerHistoryChartProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return <p className="text-muted-foreground text-center p-4">No history data to display chart.</p>;
  }

  // Format data for recharts: convert time to a more readable format for XAxis
  const formattedData = history.map(entry => ({
    ...entry,
    time: new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={formattedData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="time" stroke="hsl(var(--foreground))" />
        <YAxis yAxisId="left" stroke="hsl(var(--primary))" />
        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
        />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="points" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} name="Points" />
        <Line yAxisId="right" type="monotone" dataKey="chips" stroke="hsl(var(--accent))" activeDot={{ r: 8 }} name="Chips" />
        <Line yAxisId="left" type="monotone" dataKey="level" stroke="hsl(var(--secondary))" activeDot={{ r: 8 }} name="Level" />
        <Line yAxisId="left" type="monotone" dataKey="xp" stroke="hsl(var(--destructive))" activeDot={{ r: 8 }} name="XP" />
      </LineChart>
    </ResponsiveContainer>
  );
};