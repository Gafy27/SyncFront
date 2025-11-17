import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, X, Save, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

const availableEventClasses = [
  "EXECUTION", "MODE", "PIECES", "ONLINE", "OP_CODE", "ACTIVITY", 
  "OPERATION", "adc_420", "adc_010", "CONFIG"
];

export default function NewMachine() {
  const [, setLocation] = useLocation();
  const [machineId, setMachineId] = useState("");
  const [machineName, setMachineName] = useState("");
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const [events, setEvents] = useState<MachineEvent[]>([
    { id: "", label: "", class: "" }
  ]);
  const [properties, setProperties] = useState<MachineProperty[]>([
    { key: "", value: "" }
  ]);

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

  const handleSave = () => {
    const machineData = {
      machine_id: machineId,
      name: machineName || undefined,
      events: events.filter(e => e.id && e.class).map(e => ({
        id: e.id,
        ...(e.label && { label: e.label }),
        class: e.class
      })),
      connectors: selectedConnectors,
      properties: properties
        .filter(p => p.key && p.value)
        .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {})
    };
    
    console.log("Nueva máquina:", machineData);
    setLocation("/applications");
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
                Identificador único de la máquina (EUI, MAC, etc.)
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
