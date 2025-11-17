import { useState } from "react";
import { Plus, Boxes, Cpu, Cable, Tag, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";

const mockApplications = [
  {
    id: "1",
    name: "Smart Factory IoT",
    type: "IoT Monitoring",
    status: "active",
    description: "Sistema de monitoreo de máquinas CNC",
    organization: "Autentio Manufacturing",
    machines: 24,
    eventClasses: 12,
    connectors: 6,
    functions: 8,
  },
  {
    id: "2",
    name: "Warehouse Automation",
    type: "Logistics",
    status: "active",
    description: "Automatización de almacén y robots",
    organization: "Autentio Logistics",
    machines: 15,
    eventClasses: 8,
    connectors: 4,
    functions: 5,
  },
];

const mockMachines = [
  {
    id: "1",
    machineId: "24e124454e282635",
    name: "CNC-001",
    status: "online",
    events: 15,
    connectors: ["FANUC", "MQTT"],
  },
  {
    id: "2",
    machineId: "35f235565f393746",
    name: "CNC-002",
    status: "online",
    events: 12,
    connectors: ["Siemens", "MQTT"],
  },
];

const mockEventClasses = [
  { id: "1", className: "EXECUTION", topic: "accepted", type: "STR", authValues: 8 },
  { id: "2", className: "MODE", topic: "accepted", type: "STR", authValues: 6 },
  { id: "3", className: "adc_420", topic: "accepted", type: "FLOAT", authValues: 0 },
];

export default function Applications() {
  const [applications] = useState(mockApplications);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleNewMachine = () => {
    setLocation("/machines/new");
  };

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Aplicaciones</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
            Aplicaciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona las aplicaciones y sus flujos de datos
          </p>
        </div>
        <Button data-testid="button-add-application">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Aplicación
        </Button>
      </div>

      {!selectedApp ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applications.map((app) => (
            <Card 
              key={app.id} 
              className="hover-elevate cursor-pointer" 
              onClick={() => setSelectedApp(app.id)}
              data-testid={`card-application-${app.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Boxes className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-app-name-${app.id}`}>
                        {app.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {app.description}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="default"
                    className="bg-green-100 text-green-700 border-green-200"
                  >
                    {app.status === "active" ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold">{app.machines}</div>
                    <div className="text-xs text-muted-foreground">Máquinas</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold">{app.eventClasses}</div>
                    <div className="text-xs text-muted-foreground">Clases</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold">{app.connectors}</div>
                    <div className="text-xs text-muted-foreground">Conectores</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold">{app.functions}</div>
                    <div className="text-xs text-muted-foreground">Funciones</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <Button 
            variant="ghost" 
            onClick={() => setSelectedApp(null)} 
            className="mb-6"
            data-testid="button-back-to-apps"
          >
            ← Volver a Aplicaciones
          </Button>

          <Tabs defaultValue="machines" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="machines" data-testid="tab-machines">
                <Cpu className="w-4 h-4 mr-2" />
                Máquinas
              </TabsTrigger>
              <TabsTrigger value="connectors" data-testid="tab-connectors">
                <Cable className="w-4 h-4 mr-2" />
                Conectores
              </TabsTrigger>
              <TabsTrigger value="classes" data-testid="tab-classes">
                <Tag className="w-4 h-4 mr-2" />
                Clases de Eventos
              </TabsTrigger>
              <TabsTrigger value="functions" data-testid="tab-functions">
                <Code className="w-4 h-4 mr-2" />
                Funciones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="machines">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Máquinas</h2>
                <Button onClick={handleNewMachine} data-testid="button-add-machine">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Máquina
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockMachines.map((machine) => (
                  <Card key={machine.id} className="hover-elevate" data-testid={`card-machine-${machine.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{machine.name}</CardTitle>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {machine.machineId}
                          </p>
                        </div>
                        <Badge 
                          variant="default"
                          className="bg-green-100 text-green-700 border-green-200"
                        >
                          Online
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Eventos:</span> {machine.events}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {machine.connectors.map((conn, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {conn}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="connectors">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Conectores</h2>
                <Button data-testid="button-link-connector">
                  <Plus className="w-4 h-4 mr-2" />
                  Vincular Conector
                </Button>
              </div>
              <p className="text-muted-foreground">
                Conectores vinculados a esta aplicación
              </p>
            </TabsContent>

            <TabsContent value="classes">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Clases de Eventos</h2>
                <Button data-testid="button-add-event-class">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Clase
                </Button>
              </div>
              <div className="space-y-3">
                {mockEventClasses.map((eventClass) => (
                  <Card key={eventClass.id} className="hover-elevate" data-testid={`card-event-class-${eventClass.id}`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Tag className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold font-mono">{eventClass.className}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span>Topic: {eventClass.topic}</span>
                              <span>•</span>
                              <span>Type: {eventClass.type}</span>
                              {eventClass.authValues > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{eventClass.authValues} valores autorizados</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="functions">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Funciones</h2>
                <Button data-testid="button-add-function">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Función
                </Button>
              </div>
              <p className="text-muted-foreground">
                Funciones de procesamiento y transformación de datos
              </p>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
