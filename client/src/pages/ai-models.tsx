import { useState } from "react";
import { Plus, Search, Brain } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";

const mockModels = [
  { 
    id: "model-1", 
    name: "Predicción de Fallos CNC", 
    type: "Classification", 
    status: "active" as const, 
    accuracy: 94.5,
    lastTrained: "Hace 2 días",
    description: "Modelo de clasificación para predecir fallos en máquinas CNC"
  },
  { 
    id: "model-2", 
    name: "Detección de Anomalías", 
    type: "Anomaly Detection", 
    status: "active" as const, 
    accuracy: 97.2,
    lastTrained: "Hace 1 día",
    description: "Detección de comportamientos anómalos en sensores IoT"
  },
  { 
    id: "model-3", 
    name: "Clasificación de Calidad", 
    type: "Computer Vision", 
    status: "processing" as const, 
    accuracy: 91.8,
    lastTrained: "Entrenando...",
    description: "Clasificación automática de productos por visión artificial"
  },
  { 
    id: "model-4", 
    name: "Optimización de Rutas", 
    type: "Reinforcement Learning", 
    status: "active" as const, 
    accuracy: 88.3,
    lastTrained: "Hace 5 días",
    description: "Optimización de rutas para robots móviles"
  },
  { 
    id: "model-5", 
    name: "Pronóstico de Demanda", 
    type: "Time Series", 
    status: "active" as const, 
    accuracy: 92.1,
    lastTrained: "Hace 3 días",
    description: "Predicción de demanda energética basada en históricos"
  },
  { 
    id: "model-6", 
    name: "Control Adaptativo", 
    type: "Deep Learning", 
    status: "inactive" as const, 
    accuracy: 85.7,
    lastTrained: "Hace 2 semanas",
    description: "Sistema de control adaptativo para brazos robóticos"
  },
];

export default function AiModels() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredModels = mockModels.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Modelos IA</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Modelos de Inteligencia Artificial</h1>
        <Button data-testid="button-add-model">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Modelo
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-models"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredModels.map((model) => (
          <Card key={model.id} className="hover-elevate" data-testid={`card-model-${model.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-model-name-${model.id}`}>{model.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{model.type}</p>
                  </div>
                </div>
                <StatusBadge status={model.status} testId={`badge-status-${model.id}`} />
              </div>
              <CardDescription>{model.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Precisión</span>
                    <span className="text-sm font-semibold" data-testid={`text-accuracy-${model.id}`}>{model.accuracy}%</span>
                  </div>
                  <Progress value={model.accuracy} className="h-2" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Último entrenamiento:</span>
                  <span className="text-sm">{model.lastTrained}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
