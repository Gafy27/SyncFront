import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

const mockApplications = [
  { 
    id: "app-1", 
    name: "Monitoreo de Temperatura", 
    type: "Data Analytics", 
    status: "active" as const, 
    description: "Sistema de análisis en tiempo real de sensores de temperatura",
    devices: 45
  },
  { 
    id: "app-2", 
    name: "Control de Producción CNC", 
    type: "Automation", 
    status: "active" as const, 
    description: "Automatización y control de máquinas CNC",
    devices: 12
  },
  { 
    id: "app-3", 
    name: "Visión Artificial - Calidad", 
    type: "AI Vision", 
    status: "processing" as const, 
    description: "Inspección automática de calidad con IA",
    devices: 8
  },
  { 
    id: "app-4", 
    name: "Mantenimiento Predictivo", 
    type: "Machine Learning", 
    status: "active" as const, 
    description: "Predicción de fallos en maquinaria industrial",
    devices: 28
  },
  { 
    id: "app-5", 
    name: "Optimización Energética", 
    type: "Analytics", 
    status: "active" as const, 
    description: "Análisis y optimización del consumo energético",
    devices: 62
  },
  { 
    id: "app-6", 
    name: "Robot Colaborativo", 
    type: "Robotics", 
    status: "inactive" as const, 
    description: "Coordinación de brazos robóticos colaborativos",
    devices: 5
  },
];

export default function Applications() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApps = mockApplications.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Aplicaciones</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Aplicaciones</h1>
        <Button data-testid="button-add-application">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Aplicación
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aplicaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-applications"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app) => (
          <Card key={app.id} className="hover-elevate" data-testid={`card-application-${app.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg" data-testid={`text-app-name-${app.id}`}>{app.name}</CardTitle>
                <StatusBadge status={app.status} testId={`badge-status-${app.id}`} />
              </div>
              <CardDescription>{app.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <span className="text-sm font-medium">{app.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dispositivos:</span>
                  <span className="text-sm font-semibold text-primary">{app.devices}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
