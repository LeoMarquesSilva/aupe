import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { GLASS } from '../../theme/glassTokens';

interface SparklineMiniProps {
  data: number[];
  color?: string;
  height?: number;
}

const SparklineMini: React.FC<SparklineMiniProps> = ({
  data,
  color = GLASS.accent.blue,
  height = 32,
}) => {
  const chartData = data.map((value, index) => ({ v: value, i: index }));

  if (chartData.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
          animationDuration={1200}
          animationEasing="ease-in-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SparklineMini;
