import { useState } from "react";
import { Plus, Search, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

const mockGateways = [
  { id: "GATE-01", name: "Gateway Principal Norte", location: "Edificio A - Piso 3", status: "connected" as const, devices: 24, lastSeen: "Hace 1 minuto" },
  { id: "GATE-03", name: "Gateway Producción", location: "Planta - Área 1", status: "connected" as const, devices: 18, lastSeen: "Hace 2 minutos" },
  { id: "GATE-05", name: "Gateway Almacén", location: "Almacén Central", status: "connected" as const, devices: 12, lastSeen: "Hace 30 segundos" },
  { id: "GATE-07", name: "Gateway Laboratorio", location: "Edificio B - Lab 2", status: "connected" as const, devices: 15, lastSeen: "Hace 5 minutos" },
  { id: "GATE-09", name: "Gateway IoT Sur", location: "Edificio C - Piso 1", status: "connected" as const, devices: 32, lastSeen: "Hace 3 minutos" },
  { id: "GATE-12", name: "Gateway Robótica", location: "Planta - Área 3", status: "connected" as const, devices: 27, lastSeen: "Hace 2 minutos" },
];

export default function Gateways() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGateways = mockGateways.filter(gateway => 
    gateway.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gateway.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Gateways</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Gateways</h1>
        <Button data-testid="button-add-gateway">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Gateway
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar gateways..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-gateways"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGateways.map((gateway) => (
          <Card key={gateway.id} className="hover-elevate" data-testid={`card-gateway-${gateway.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-mono text-muted-foreground mb-1">{gateway.id}</p>
                  <h3 className="font-semibold" data-testid={`text-gateway-name-${gateway.id}`}>{gateway.name}</h3>
                </div>
                <StatusBadge status={gateway.status} testId={`badge-status-${gateway.id}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm text-muted-foreground">{gateway.location}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Dispositivos:</span>
                    <span className="text-lg font-semibold text-primary">{gateway.devices}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Última vez:</span>
                    <span className="text-sm">{gateway.lastSeen}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
