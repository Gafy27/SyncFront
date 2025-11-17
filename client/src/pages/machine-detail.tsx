import { useRoute, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import robotImage from "@assets/hcr5_1763338650795.png";

const mockMachineDetails = {
  "3": {
    id: "3",
    machineId: "celda01-hcr5-2024",
    name: "Celda-01",
    status: "online",
    isMoving: true,
    connector: "Universal Robots",
    events: ["EXECUTION", "MODE", "POSITION", "SPEED", "TOOL_STATUS", "EMERGENCY", "ONLINE", "BATTERY"],
    network: {
      ip: "192.168.1.150",
      port: "30001",
    },
    workOrder: "WO-2024-1147",
    application: "RoboSync",
    recentEvents: [
      { timestamp: "12:45:32", id: "evt_001", content: "POSITION", value: "X:125.4 Y:87.2 Z:42.1" },
      { timestamp: "12:45:30", id: "evt_002", content: "SPEED", value: "85%" },
      { timestamp: "12:45:28", id: "evt_003", content: "MODE", value: "AUTOMATIC" },
      { timestamp: "12:45:25", id: "evt_004", content: "EXECUTION", value: "ACTIVE" },
      { timestamp: "12:45:20", id: "evt_005", content: "TOOL_STATUS", value: "GRIPPER_OPEN" },
    ],
  },
  "1": {
    id: "1",
    machineId: "24e124454e282635",
    name: "CNC-001",
    status: "online",
    isMoving: false,
    connector: "FANUC",
    events: ["EXECUTION", "MODE", "SPINDLE_SPEED", "FEED_RATE", "TOOL_NUMBER"],
    network: {
      ip: "192.168.1.100",
      port: "8193",
    },
    workOrder: "WO-2024-1089",
    application: "Smart Factory IoT",
    recentEvents: [
      { timestamp: "12:46:15", id: "evt_101", content: "SPINDLE_SPEED", value: "12000 RPM" },
      { timestamp: "12:46:10", id: "evt_102", content: "FEED_RATE", value: "350 mm/min" },
      { timestamp: "12:46:05", id: "evt_103", content: "EXECUTION", value: "ACTIVE" },
    ],
  },
  "2": {
    id: "2",
    machineId: "35f235565f393746",
    name: "CNC-002",
    status: "online",
    isMoving: true,
    connector: "Siemens",
    events: ["EXECUTION", "MODE", "PROGRAM_NAME"],
    network: {
      ip: "192.168.1.101",
      port: "102",
    },
    workOrder: "WO-2024-1090",
    application: "Smart Factory IoT",
    recentEvents: [
      { timestamp: "12:47:00", id: "evt_201", content: "PROGRAM_NAME", value: "PART_5678.NC" },
      { timestamp: "12:46:55", id: "evt_202", content: "MODE", value: "AUTOMATIC" },
      { timestamp: "12:46:50", id: "evt_203", content: "EXECUTION", value: "ACTIVE" },
    ],
  },
};

export default function MachineDetail() {
  const [, params] = useRoute("/machines/:id");
  const [, setLocation] = useLocation();
  
  const machineId = params?.id || "3";
  const machine = mockMachineDetails[machineId as keyof typeof mockMachineDetails];

  if (!machine) {
    return (
      <div className="p-10">
        <p>Máquina no encontrada</p>
      </div>
    );
  }

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / Aplicaciones / {machine.application} / <span className="text-foreground">{machine.name}</span>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/applications")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold mb-1" data-testid="text-machine-name">
            {machine.name}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {machine.machineId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <img 
                src={robotImage} 
                alt={machine.name} 
                className="w-full h-auto"
                data-testid="img-robot"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monitoreo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <Badge 
                  variant="default"
                  className="bg-green-100 text-green-700 border-green-200 w-full justify-center py-3 text-base"
                  data-testid="badge-connected"
                >
                  Conectado
                </Badge>
                {machine.isMoving && (
                  <Badge 
                    variant="default"
                    className="bg-blue-100 text-blue-700 border-blue-200 w-full justify-center py-3 text-base"
                    data-testid="badge-moving"
                  >
                    En Movimiento
                  </Badge>
                )}
                <Badge 
                  variant="secondary"
                  className="w-full justify-center py-3 text-base"
                  data-testid="badge-uptime"
                >
                  Tiempo en Funcionamiento
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Últimos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Horario</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contenido</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machine.recentEvents.map((event, idx) => (
                      <tr key={idx} className="border-b last:border-0" data-testid={`row-event-${idx}`}>
                        <td className="py-3 px-4 font-mono text-xs">{event.timestamp}</td>
                        <td className="py-3 px-4 font-mono text-xs">{event.id}</td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="text-xs">
                            {event.content}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{event.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Datos de Red</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">IP</div>
                      <div className="font-mono text-sm" data-testid="text-ip">{machine.network.ip}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">PUERTO</div>
                      <div className="font-mono text-sm">{machine.network.port}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Orden de Trabajo</h3>
                  <div className="font-mono text-sm" data-testid="text-work-order">
                    {machine.workOrder}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Propiedades</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Conector:</span>
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-xs">{machine.connector}</Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">ID:</span>
                      <div className="font-mono text-xs mt-1" data-testid="text-machine-id">{machine.machineId}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
