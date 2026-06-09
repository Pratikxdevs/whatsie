import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface MessageVolumeChartProps {
  data: Array<{ date: string; inbound: number; outbound: number }>;
}

export function MessageVolumeChart({ data }: MessageVolumeChartProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
          />
          <XAxis
            dataKey="date"
            stroke="#7D7D8A"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#7D7D8A"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#141415',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
            }}
            labelStyle={{ color: '#EBEBF0' }}
          />
          <Line
            type="monotone"
            dataKey="inbound"
            stroke="#4ADE80"
            strokeWidth={2}
            dot={false}
            name="Inbound"
          />
          <Line
            type="monotone"
            dataKey="outbound"
            stroke="#60A5FA"
            strokeWidth={2}
            dot={false}
            name="Outbound"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
