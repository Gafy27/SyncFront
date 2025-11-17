import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";

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

const severityConfig = {
  critical: {
    variant: "destructive" as const,
    label: "Crítica",
    className: undefined,
  },
  warning: {
    variant: "default" as const,
    label: "Advertencia",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  info: {
    variant: "secondary" as const,
    label: "Info",
    className: undefined,
  },
};

export function AlarmsTable() {
  return (
    <Card data-testid="card-alarms-table">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Últimas Alarmas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Dispositivo</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>Mensaje</TableHead>
              <TableHead>Aplicación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAlarms.map((alarm) => {
              const config = severityConfig[alarm.severity];
              return (
                <TableRow key={alarm.id} data-testid={`row-alarm-${alarm.id}`}>
                  <TableCell className="font-mono text-sm">
                    {alarm.timestamp}
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {alarm.deviceId}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={config.variant}
                      className={config.className}
                      data-testid={`badge-severity-${alarm.severity}-${alarm.id}`}
                    >
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{alarm.message}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {alarm.application}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
