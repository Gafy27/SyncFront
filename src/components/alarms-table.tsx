import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Alarm {
  id: string;
  timestamp: string;
  deviceId: string;
  severity: "critical" | "warning" | "info";
  message: string;
  application: string;
}

const mockAlarms: Alarm[] = [
  {
    id: "1",
    timestamp: "13:45:23",
    deviceId: "CNC003",
    severity: "critical",
    message: "Temperatura excede límite crítico (85°C)",
    application: "Smart Factory IoT",
  },
  {
    id: "2",
    timestamp: "13:42:15",
    deviceId: "ARM-001",
    severity: "warning",
    message: "Vibración anormal detectada",
    application: "RoboSync",
  },
  {
    id: "3",
    timestamp: "13:38:47",
    deviceId: "SENSOR-102",
    severity: "critical",
    message: "Pérdida de comunicación",
    application: "Smart Factory IoT",
  },
  {
    id: "4",
    timestamp: "13:35:12",
    deviceId: "HCR5-01",
    severity: "warning",
    message: "Mantenimiento preventivo requerido",
    application: "RoboSync",
  },
  {
    id: "5",
    timestamp: "13:30:08",
    deviceId: "NODE-8821",
    severity: "info",
    message: "Batería baja (15%)",
    application: "Warehouse Automation",
  },
];

const severityColors = {
  critical: "bg-red-100 text-red-700 hover:bg-red-100",
  warning: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  info: "bg-blue-100 text-blue-700 hover:bg-blue-100",
};

export function AlarmsTable() {
  return (
    <Card data-testid="card-alarms-table">
      <CardContent>
        <div className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase">Timestamp</TableHead>
                <TableHead className="text-xs font-medium uppercase">Device ID</TableHead>
                <TableHead className="text-xs font-medium uppercase">Severidad</TableHead>
                <TableHead className="text-xs font-medium uppercase">Mensaje</TableHead>
                <TableHead className="text-xs font-medium uppercase">Aplicación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAlarms.map((alarm) => (
                <TableRow key={alarm.id}>
                  <TableCell className="font-mono text-xs">{alarm.timestamp}</TableCell>
                  <TableCell className="font-medium">{alarm.deviceId}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={severityColors[alarm.severity]}
                    >
                      {alarm.severity.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{alarm.message}</TableCell>
                  <TableCell className="text-muted-foreground">{alarm.application}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
