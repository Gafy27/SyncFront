import { useState } from "react";
import { useLocation } from "wouter";
import { Save, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/providers/organization-provider";

export default function NewApplication() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();
  const [applicationId, setApplicationId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!selectedOrg) {
      toast({
        title: "Selecciona una organización",
        description: "Debes elegir una organización antes de crear una aplicación",
        variant: "destructive",
      });
      return;
    }

    if (!applicationId.trim()) {
      toast({
        title: "Error",
        description: "El ID de aplicación es requerido",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive",
      });
      return;
    }

    // Include organization_id in the applicationData payload as required by the API
    const applicationData = {
      applicationId: applicationId.trim(),
      name: name.trim(),
      description: description.trim() || '',
      organization_id: selectedOrg,
    };

    try {
      const response = await apiRequest(
        'POST', 
        `/api/organizations/${selectedOrg}/applications`, 
        applicationData
      );
      const data = await response.json() as Application;

      // Invalidate queries to refresh the applications list
      await queryClient.invalidateQueries({ queryKey: ['/api/organizations', selectedOrg, 'applications'] });

      toast({
        title: "Éxito",
        description: "Aplicación creada correctamente",
      });

      setLocation("/applications");
    } catch (error) {
      console.error("Error creating application:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la aplicación",
        variant: "destructive",
      });
    }
  };

  if (!selectedOrg) {
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/applications")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Aplicaciones
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Selecciona una organización para crear aplicaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/applications")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Aplicaciones
        </Button>
        
        <div>
          <h1 className="text-3xl font-semibold mb-2">
            Nueva Aplicación
          </h1>
          <p className="text-muted-foreground">
            Crea una nueva aplicación en el sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Aplicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="application-id">ID de Aplicación *</Label>
            <Input
              id="application-id"
              placeholder="ej: smart-factory-iot"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Identificador único de la aplicación (sin espacios, usar guiones o guiones bajos)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="application-name">Nombre *</Label>
            <Input
              id="application-name"
              placeholder="ej: Smart Factory IoT"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="application-description">Descripción</Label>
            <Textarea
              id="application-description"
              placeholder="ej: Sistema de monitoreo de máquinas CNC"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-6">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/applications")}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Guardar Aplicación
        </Button>
      </div>
    </div>
  );
}

