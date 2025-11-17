import { Cpu, Radio, Activity, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { MessageFlowChart } from "@/components/message-flow-chart";
import { EventsTable } from "@/components/events-table";
import { UsageStatistics } from "@/components/usage-statistics";
import { AlarmsTable } from "@/components/alarms-table";

const mockChartData = [
  { time: "00:00", messages: 450 },
  { time: "04:00", messages: 320 },
  { time: "08:00", messages: 680 },
  { time: "12:00", messages: 920 },
  { time: "16:00", messages: 1100 },
  { time: "20:00", messages: 850 },
  { time: "24:00", messages: 520 },
];

const mockEvents = [
  {
    id: "1",
    timestamp: "13:42:01",
    deviceId: "CNC003",
    type: "uplink",
    payload: "36B",
    gatewayId: "GATE-12",
  },
  {
    id: "2",
    timestamp: "13:41:54",
    deviceId: "CNC005",
    type: "uplink",
    payload: "28B",
    gatewayId: "GATE-09",
  },
  {
    id: "3",
    timestamp: "13:41:50",
    deviceId: "NODE-8821",
    type: "status",
    payload: "—",
    gatewayId: "GATE-07",
  },
  {
    id: "4",
    timestamp: "13:41:45",
    deviceId: "SENSOR-102",
    type: "uplink",
    payload: "42B",
    gatewayId: "GATE-12",
  },
  {
    id: "5",
    timestamp: "13:41:40",
    deviceId: "ARM-001",
    type: "status",
    payload: "—",
    gatewayId: "GATE-03",
  },
];

export default function Dashboard() {
  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Dashboard General</span>
      </div>

      <h1 className="text-3xl font-semibold mb-8" data-testid="text-page-title">
        Vista General
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <KpiCard 
          title="Dispositivos Activos" 
          value={128} 
          icon={Cpu} 
          iconColor="text-green-600"
          testId="card-devices-active"
        />
        <KpiCard 
          title="Gateways Conectados" 
          value={14} 
          icon={Radio} 
          iconColor="text-blue-600"
          testId="card-gateways-connected"
        />
        <KpiCard 
          title="Eventos (Última hora)" 
          value="12,532" 
          icon={Activity} 
          iconColor="text-purple-600"
          testId="card-events-hour"
        />
        <KpiCard 
          title="Dispositivos en Alarma" 
          value={5} 
          icon={AlertTriangle} 
          iconColor="text-red-600"
          testId="card-devices-alarm"
        />
      </div>

      <div className="mb-10">
        <UsageStatistics />
      </div>

      <div className="mb-10">
        <MessageFlowChart data={mockChartData} />
      </div>

      <div className="mb-10">
        <EventsTable events={mockEvents} />
      </div>

      <AlarmsTable />
    </div>
  );
}
