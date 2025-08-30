import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlayerHistoryEntry } from '@/hooks/useLeaderboardData'; // Import from hook

// New interface for data passed to the chart, extending the base entry
export interface FormattedPlayerHistoryEntry extends PlayerHistoryEntry {
  displayTime: string; // Formatted time for display on X-axis
}

interface PlayerHistoryChartProps {
  history: FormattedPlayerHistoryEntry[]; // Now expects formatted data
}

export const PlayerHistoryChart: React.FC<PlayerHistoryChartProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return <p className="text-muted-foreground text-center p-4">No history data to display chart.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={history} // Use history directly, as it's already formatted
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="displayTime" stroke="hsl(var(--foreground))" /> {/* Use displayTime */}
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