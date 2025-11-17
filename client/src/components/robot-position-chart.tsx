import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const mockPositionData = [
  { time: "12:45:00", x: 120.5, y: 85.3, z: 40.2 },
  { time: "12:45:02", x: 122.1, y: 86.7, z: 41.5 },
  { time: "12:45:04", x: 125.3, y: 88.1, z: 43.2 },
  { time: "12:45:06", x: 128.7, y: 87.9, z: 44.8 },
  { time: "12:45:08", x: 132.4, y: 86.5, z: 45.1 },
  { time: "12:45:10", x: 135.2, y: 85.2, z: 43.9 },
  { time: "12:45:12", x: 137.8, y: 84.8, z: 42.7 },
  { time: "12:45:14", x: 139.1, y: 85.5, z: 41.3 },
  { time: "12:45:16", x: 138.5, y: 87.2, z: 40.8 },
  { time: "12:45:18", x: 136.2, y: 88.9, z: 41.9 },
  { time: "12:45:20", x: 133.7, y: 89.5, z: 43.5 },
  { time: "12:45:22", x: 130.4, y: 88.8, z: 44.2 },
  { time: "12:45:24", x: 127.9, y: 87.4, z: 43.8 },
  { time: "12:45:26", x: 126.1, y: 86.1, z: 42.6 },
  { time: "12:45:28", x: 125.0, y: 86.8, z: 41.9 },
  { time: "12:45:30", x: 125.4, y: 87.2, z: 42.1 },
];

export function RobotPositionChart() {
  return (
    <Card data-testid="card-robot-position-chart">
      <CardHeader>
        <CardTitle>Posición en Tiempo Real</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={mockPositionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fontSize: 11 }}
                interval={2}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
                domain={[0, 200]}
                label={{ value: 'Eje X (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="x" 
                stroke="#22D3EE" 
                strokeWidth={2}
                name="Eje X"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={mockPositionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fontSize: 11 }}
                interval={2}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
                domain={[0, 150]}
                label={{ value: 'Eje Y (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Eje Y"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={mockPositionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fontSize: 11 }}
                interval={2}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                label={{ value: 'Eje Z (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="z" 
                stroke="#FBBF24" 
                strokeWidth={2}
                name="Eje Z"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
