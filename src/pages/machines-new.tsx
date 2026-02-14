import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Plus, X, Save, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { queryClient } from "@/lib/queryClient";
import { machines as machinesApi, applications as applicationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";

type MachineEvent = {
  id: string;
  label: string;
  class: string;
};

type MachineProperty = {
  key: string;
  value: string;
};

const availableConnectors = [
  "FANUC", "HAAS", "Siemens", "ABB", "Mazak", "MQTT", "Modbus", "LoRa", 
  "DMG MORI", "Okuma", "KUKA", "Yaskawa", "Universal Robots", "Rockwell"
];

const CNC_CONNECTORS = ["FANUC", "HAAS", "Siemens", "Mazak", "DMG MORI", "Okuma", "Rockwell"];
const ROBOT_CONNECTORS = ["ABB", "KUKA", "Universal Robots", "Yaskawa"];

const availableEventClasses = [
  "EXECUTION", "MODE", "PIECES", "ONLINE", "OP_CODE", "ACTIVITY", 
  "OPERATION", "adc_420", "adc_010", "CONFIG"
];

export default function NewMachine() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ applicationId?: string }>("/machines/new/:applicationId?");
  const { selectedOrg } = useOrganization();
  const [selectedApplication, setSelectedApplication] = useState<string>("");
  const [machineId, setMachineId] = useState("");
  const [machineName, setMachineName] = useState("");
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const [events, setEvents] = useState<MachineEvent[]>([
    { id: "", label: "", class: "" }
  ]);
  const [properties, setProperties] = useState<MachineProperty[]>([
    { key: "", value: "" }
  ]);
  const [machineIP, setMachineIP] = useState("");
  const [machinePort, setMachinePort] = useState("");
  const [machineImageUrl, setMachineImageUrl] = useState("");

  const handleAddEvent = () => {
    setEvents([...events, { id: "", label: "", class: "" }]);
  };

  const handleRemoveEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const handleEventChange = (index: number, field: keyof MachineEvent, value: string) => {
    const newEvents = [...events];
    newEvents[index][field] = value;
    setEvents(newEvents);
  };

  const handleAddProperty = () => {
    setProperties([...properties, { key: "", value: "" }]);
  };

  const handleRemoveProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const handlePropertyChange = (index: number, field: 'key' | 'value', value: string) => {
    const newProperties = [...properties];
    newProperties[index][field] = value;
    setProperties(newProperties);
  };

  const handleConnectorToggle = (connector: string) => {
    if (selectedConnectors.includes(connector)) {
      setSelectedConnectors(selectedConnectors.filter(c => c !== connector));
    } else {
      setSelectedConnectors([...selectedConnectors, connector]);
    }
  };

  const { toast } = useToast();

  // Fetch applications for selection
  const { data: applications = [], isLoading: isLoadingApps } = useQuery<any[]>({
    queryKey: ['applications', selectedOrg],
    queryFn: () => applicationsApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  // Auto-select application from URL params
  useEffect(() => {
    if (params?.applicationId && !selectedApplication) {
      setSelectedApplication(params.applicationId);
    }
  }, [params?.applicationId, selectedApplication]);

  const handleSave = async () => {
    const applicationId = params?.applicationId || selectedApplication;

    if (!selectedOrg) {
      toast({
        title: "Error",
        description: "Debe seleccionar una organización",
        variant: "destructive",
      });
      return;
    }

    if (!applicationId) {
      toast({
        title: "Error",
        description: "Debe seleccionar una aplicación",
        variant: "destructive",
      });
      return;
    }

    if (!machineId.trim()) {
      toast({
        title: "Error",
        description: "El ID de la máquina es requerido",
        variant: "destructive",
      });
      return;
    }

    const machineData = {
      machine_id: machineId.trim(),
      application_id: applicationId,
      organization_id: selectedOrg,
      name: machineName.trim() || undefined,
      events: events.filter(e => e.id && e.class).map(e => ({
        id: e.id,
        ...(e.label && { label: e.label }),
        class: e.class
      })),
      connectors: selectedConnectors,
      properties: {
        ...(properties
          .filter(p => p.key && p.value)
          .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {})),
        ip: machineIP.trim() || undefined,
        port: machinePort.trim() ? (isNaN(Number(machinePort.trim())) ? machinePort.trim() : Number(machinePort.trim())) : undefined,
        imageUrl: machineImageUrl.trim() || undefined
      }
    };

    try {
      await machinesApi.create(selectedOrg, applicationId, machineData);

      await queryClient.invalidateQueries({
        queryKey: ['organizations', selectedOrg, 'applications', applicationId, 'machines']
      });
      await queryClient.invalidateQueries({
        queryKey: ['applications', selectedOrg]
      });

      toast({
        title: "Éxito",
        description: "Máquina creada correctamente",
      });

      setLocation(`/applications?app=${applicationId}`);
    } catch (error) {
      console.error("Error creating machine:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la máquina",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/applications")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Aplicaciones
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
              Nueva Máquina
            </h1>
            <p className="text-muted-foreground">
              Configura una nueva máquina en el sistema
            </p>
          </div>
          <Button onClick={handleSave} data-testid="button-save-machine">
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!params?.applicationId && (
              <div className="space-y-2">
                <Label htmlFor="application-select">Aplicación *</Label>
                <Select
                  value={selectedApplication}
                  onValueChange={setSelectedApplication}
                  disabled={isLoadingApps}
                >
                  <SelectTrigger data-testid="select-application">
                    <SelectValue placeholder="Seleccionar aplicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((app: any) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.name || app.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {params?.applicationId && (
              <div className="space-y-2">
                <Label htmlFor="application-display">Aplicación</Label>
                <div className="px-3 py-2 bg-muted rounded-md">
                  {applications.find((app: any) => app.id === params.applicationId)?.name || params.applicationId}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="machine-id">ID de Máquina *</Label>
              <Input
                id="machine-id"
                placeholder="ej: 24e124454e282635"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="font-mono"
                data-testid="input-machine-id"
              />
              <p className="text-xs text-muted-foreground">
                Identificador único de la máquina (ID, Machine ID, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine-name">Nombre (Opcional)</Label>
              <Input
                id="machine-name"
                placeholder="ej: CNC-001"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                data-testid="input-machine-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine-image-url">URL de Imagen (Opcional)</Label>
              <Input
                id="machine-image-url"
                placeholder="ej: https://example.com/machine-image.jpg"
                value={machineImageUrl}
                onChange={(e) => setMachineImageUrl(e.target.value)}
                type="url"
                data-testid="input-machine-image-url"
              />
              <p className="text-xs text-muted-foreground">
                URL de la imagen que se mostrará en el detalle de la máquina
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Conectores</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedConnectors.length} seleccionado{selectedConnectors.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableConnectors.map((connector) => {
                const isSelected = selectedConnectors.includes(connector);
                return (
                  <Badge
                    key={connector}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer hover-elevate ${
                      isSelected ? "bg-primary text-primary-foreground" : ""
                    }`}
                    onClick={() => handleConnectorToggle(connector)}
                    data-testid={`badge-connector-${connector.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {connector}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {(selectedConnectors.some(c => CNC_CONNECTORS.includes(c)) || 
          selectedConnectors.some(c => ROBOT_CONNECTORS.includes(c))) && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Red</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="machine-ip">IP</Label>
                <Input
                  id="machine-ip"
                  placeholder="ej: 192.168.1.100"
                  value={machineIP}
                  onChange={(e) => setMachineIP(e.target.value)}
                  className="font-mono"
                  data-testid="input-machine-ip"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machine-port">Puerto</Label>
                <Input
                  id="machine-port"
                  placeholder="ej: 8080"
                  value={machinePort}
                  onChange={(e) => setMachinePort(e.target.value)}
                  className="font-mono"
                  data-testid="input-machine-port"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Eventos</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddEvent}
                data-testid="button-add-event"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Evento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((event, index) => (
              <div key={index} className="space-y-3">
                {index > 0 && <Separator />}
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`event-id-${index}`}>ID *</Label>
                      <Input
                        id={`event-id-${index}`}
                        placeholder="ej: adc_1"
                        value={event.id}
                        onChange={(e) => handleEventChange(index, 'id', e.target.value)}
                        className="font-mono"
                        data-testid={`input-event-id-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`event-label-${index}`}>Etiqueta (Opcional)</Label>
                      <Input
                        id={`event-label-${index}`}
                        placeholder="ej: level_420"
                        value={event.label}
                        onChange={(e) => handleEventChange(index, 'label', e.target.value)}
                        data-testid={`input-event-label-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`event-class-${index}`}>Clase *</Label>
                      <Select
                        value={event.class}
                        onValueChange={(value) => handleEventChange(index, 'class', value)}
                      >
                        <SelectTrigger data-testid={`select-event-class-${index}`}>
                          <SelectValue placeholder="Seleccionar clase" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEventClasses.map((className) => (
                            <SelectItem key={className} value={className}>
                              {className}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {events.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEvent(index)}
                      className="mt-8"
                      data-testid={`button-remove-event-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Propiedades</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddProperty}
                data-testid="button-add-property"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Propiedad
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {properties.map((property, index) => (
              <div key={index} className="space-y-3">
                {index > 0 && <Separator />}
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`property-key-${index}`}>Clave</Label>
                      <Input
                        id={`property-key-${index}`}
                        placeholder="ej: max_tank_volume"
                        value={property.key}
                        onChange={(e) => handlePropertyChange(index, 'key', e.target.value)}
                        className="font-mono"
                        data-testid={`input-property-key-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`property-value-${index}`}>Valor</Label>
                      <Input
                        id={`property-value-${index}`}
                        placeholder="ej: 2500"
                        value={property.value}
                        onChange={(e) => handlePropertyChange(index, 'value', e.target.value)}
                        data-testid={`input-property-value-${index}`}
                      />
                    </div>
                  </div>
                  {properties.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveProperty(index)}
                      className="mt-8"
                      data-testid={`button-remove-property-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Ejemplos: id_type, denomination, location, work_mode, max_tank_volume, etc.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/applications")}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} data-testid="button-save-machine-bottom">
            <Save className="w-4 h-4 mr-2" />
            Guardar Máquina
          </Button>
        </div>
      </div>
    </div>
  );
}
