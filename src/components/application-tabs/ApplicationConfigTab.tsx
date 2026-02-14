import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ApplicationConfigTabProps {
  configName: string;
  configDescription: string;
  isLoading: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ApplicationConfigTab({
  configName,
  configDescription,
  isLoading,
  onNameChange,
  onDescriptionChange,
  onSave,
  onCancel,
}: ApplicationConfigTabProps) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Configuración de la Aplicación</h2>
        <p className="text-sm text-muted-foreground">
          Edita la información básica de la aplicación
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Información de la Aplicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config-name">Nombre *</Label>
            <Input
              id="config-name"
              placeholder="ej: Smart Factory IoT"
              value={configName}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="config-description">Descripción</Label>
            <Textarea
              id="config-description"
              placeholder="ej: Sistema de monitoreo de máquinas CNC"
              value={configDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              onClick={onSave}
              disabled={isLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

