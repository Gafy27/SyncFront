import { useState } from "react";
import { Plus, Server, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockEdges = [
  {
    id: "1",
    name: "Edge-Plant-01",
    status: "online",
    location: "Planta Norte - Piso 1",
    type: "Industrial Gateway",
    lastSeen: "Hace 2 minutos",
    organization: "Autentio Manufacturing",
  },
  {
    id: "2",
    name: "Edge-Plant-02",
    status: "online",
    location: "Planta Norte - Piso 2",
    type: "Industrial Gateway",
    lastSeen: "Hace 5 minutos",
    organization: "Autentio Manufacturing",
  },
  {
    id: "3",
    name: "Edge-Warehouse-01",
    status: "offline",
    location: "Centro de Distribución",
    type: "Edge Server",
    lastSeen: "Hace 3 horas",
    organization: "Autentio Logistics",
  },
];

export default function Edges() {
  const [edges] = useState(mockEdges);

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Edges</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
            Edges
          </h1>
          <p className="text-muted-foreground">
            Gestiona los nodos edge de procesamiento distribuido
          </p>
        </div>
        <Button data-testid="button-add-edge">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Edge
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {edges.map((edge) => (
          <Card key={edge.id} className="hover-elevate" data-testid={`card-edge-${edge.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    edge.status === "online" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    <Server className={`w-5 h-5 ${
                      edge.status === "online" ? "text-green-600" : "text-red-600"
                    }`} />
                  </div>
                  <div>
                    <CardTitle className="text-base" data-testid={`text-edge-name-${edge.id}`}>
                      {edge.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {edge.type}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={edge.status === "online" ? "default" : "secondary"}
                  className={edge.status === "online" 
                    ? "bg-green-100 text-green-700 border-green-200" 
                    : ""}
                  data-testid={`badge-status-${edge.id}`}
                >
                  {edge.status === "online" ? "Online" : "Offline"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">{edge.location}</div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {edge.organization}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Última conexión: {edge.lastSeen}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
