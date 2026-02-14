import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import robotImage from "@assets/hcr5_1763338650795.png";
const cncImage = "https://imgs.search.brave.com/EjGQ_HGLx2L0-tJhhQ2oiztQTYAHLSBnkWOvnqdsISc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/bWF6YWsuY29tL2Fk/b2JlL2R5bmFtaWNt/ZWRpYS9kZWxpdmVy/L2RtLWFpZC0tMTc2/OTBkOWMtMjdjYi00/MjVhLWE4ZmItMjE3/MWJlMWU3OThmL3F0/ZS0xMDBzZy5wbmc_/cHJlZmVyd2VicD10/cnVlJnF1YWxpdHk9/MTAwJndpZHRoPTE5/MjA";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { machines as machinesApi, applications as applicationsApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { useOrganization } from "@/providers/organization-provider";

// CNC connectors
const CNC_CONNECTORS = ["FANUC", "HAAS", "Siemens", "Mazak", "DMG MORI", "Okuma", "Rockwell"];

// Robot connectors
const ROBOT_CONNECTORS = ["ABB", "KUKA", "Universal Robots", "Yaskawa"];

function isCNC(connectors: string[]): boolean {
  return connectors.some(conn => CNC_CONNECTORS.includes(conn));
}

function isRobot(connectors: string[]): boolean {
  return connectors.some(conn => ROBOT_CONNECTORS.includes(conn));
}

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

export default function MachineDetail() {
  const [, params] = useRoute<{ applicationId: string; eui: string }>("/machines/:applicationId/:eui");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();

  const applicationId = params?.applicationId;
  const machineId = params?.eui;

  // Fetch machine data
  const { data: machine, isLoading, error } = useQuery<any>({
    queryKey: ['organizations', selectedOrg, 'applications', applicationId, 'machines', machineId],
    queryFn: () => machinesApi.get(selectedOrg!, applicationId!, machineId!),
    enabled: !!selectedOrg && !!applicationId && !!machineId,
  });

  // Fetch application data for breadcrumb
  const { data: application } = useQuery<any>({
    queryKey: ['organizations', selectedOrg, 'applications', applicationId],
    queryFn: () => applicationsApi.get(selectedOrg!, applicationId!),
    enabled: !!selectedOrg && !!applicationId,
  });

  // Form State
  const [machineName, setMachineName] = useState("");
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const [events, setEvents] = useState<MachineEvent[]>([{ id: "", label: "", class: "" }]);
  const [properties, setProperties] = useState<MachineProperty[]>([{ key: "", value: "" }]);
  const [machineIP, setMachineIP] = useState("");
  const [machinePort, setMachinePort] = useState("");
  const [machineImageUrl, setMachineImageUrl] = useState("");

  // Initialize form when machine data loads
  useEffect(() => {
    if (machine) {
      setMachineName(machine.name || "");
      setSelectedConnectors(machine.connectors || []);

      if (machine.events && machine.events.length > 0) {
        setEvents(machine.events.map((e: any) => ({
          id: e.id || "",
          label: e.label || "",
          class: e.class || ""
        })));
      }

      const props = machine.properties || {};
      const propList: MachineProperty[] = [];
      Object.entries(props).forEach(([key, value]) => {
        if (key !== 'ip' && key !== 'port' && key !== 'imageUrl') {
          propList.push({ key, value: String(value) });
        }
      });
      if (propList.length === 0) propList.push({ key: "", value: "" });
      setProperties(propList);

      setMachineIP(props.ip || "");
      setMachinePort(props.port ? String(props.port) : "");
      setMachineImageUrl(props.imageUrl || "");
    }
  }, [machine]);

  // Handlers
  const handleAddEvent = () => setEvents([...events, { id: "", label: "", class: "" }]);
  const handleRemoveEvent = (index: number) => setEvents(events.filter((_, i) => i !== index));
  const handleEventChange = (index: number, field: keyof MachineEvent, value: string) => {
    const newEvents = [...events];
    newEvents[index][field] = value;
    setEvents(newEvents);
  };

  const handleAddProperty = () => setProperties([...properties, { key: "", value: "" }]);
  const handleRemoveProperty = (index: number) => setProperties(properties.filter((_, i) => i !== index));
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

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedOrg || !applicationId || !machineId) {
        throw new Error('Missing organization, application, or machine ID');
      }
      return machinesApi.update(selectedOrg, applicationId, machineId, data);
    },
    onSuccess: () => {
      if (selectedOrg && applicationId && machineId) {
        queryClient.invalidateQueries({ queryKey: ['organizations', selectedOrg, 'applications', applicationId, 'machines', machineId] });
      }
      toast({ title: "Éxito", description: "Máquina actualizada correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    const machineData = {
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
    updateMutation.mutate(machineData);
  };

  if (!applicationId || !machineId) {
    return (
      <div className="p-10">
        <p>Parámetros inválidos</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-10">
        <p>Cargando máquina...</p>
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="p-10">
        <p>Máquina no encontrada</p>
      </div>
    );
  }

  const connectors = machine.connectors || [];
  const machineType = isCNC(connectors) ? "CNC" : isRobot(connectors) ? "Robot" : null;

  // Determine which image to use: custom image URL or default based on machine type
  const defaultImage = machineType === "CNC" ? cncImage : robotImage;
  const machineImage = machine.properties?.imageUrl || defaultImage;

  // Get status from machine properties
  const machineStatus = machine.properties?.status || machine.status || "DESCONECTADA";

  // Format events for display
  const recentEvents = (machine.events || []).slice(0, 10).map((event: any, idx: number) => ({
    timestamp: new Date(machine.updatedAt || Date.now() - idx * 5000).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }),
    id: event.id || `evt_${idx}`,
    content: event.class || "UNKNOWN",
    value: event.label || "-"
  }));

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / Aplicaciones / {application?.name || applicationId} / <span className="text-foreground">{machine.name || machineId}</span>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(`/applications?app=${applicationId}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold mb-1" data-testid="text-machine-name">
            {machine.name || machineId}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {machineId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <img
                src={machineImage}
                alt={machine.name || machineId}
                className="w-full h-auto"
                data-testid="img-machine"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== defaultImage) {
                    target.src = defaultImage;
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <Badge
                  variant="default"
                  className={machineStatus === "CONECTADA" ? "bg-emerald-100 text-emerald-700 border-emerald-200 w-full justify-center py-3 text-base" : "bg-red-100 text-red-700 border-red-200 w-full justify-center py-3 text-base"}
                  data-testid="badge-state"
                >
                  {machineStatus}
                </Badge>
              </div>

              <div className="space-y-4 pt-2">
                {machine.properties?.ip && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Datos de Red</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">IP</div>
                        <div className="font-mono text-sm" data-testid="text-ip">{machine.properties.ip}</div>
                      </div>
                      {machine.properties.port && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">PUERTO</div>
                          <div className="font-mono text-sm">{machine.properties.port}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {machine.properties?.workOrder && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Orden de Trabajo</h3>
                    <div className="font-mono text-sm" data-testid="text-work-order">
                      {machine.properties.workOrder}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Propiedades</h3>
                  <div className="space-y-2 text-sm">
                    {machine.properties?.manufacturer && (
                      <div>
                        <span className="text-muted-foreground text-xs">Fabricante:</span>
                        <div className="font-medium text-sm mt-1" data-testid="text-manufacturer">{machine.properties.manufacturer}</div>
                      </div>
                    )}
                    {machine.properties?.model && (
                      <div>
                        <span className="text-muted-foreground text-xs">Modelo:</span>
                        <div className="font-medium text-sm mt-1" data-testid="text-model">{machine.properties.model}</div>
                      </div>
                    )}
                    {machine.properties?.year && (
                      <div>
                        <span className="text-muted-foreground text-xs">Año:</span>
                        <div className="font-medium text-sm mt-1" data-testid="text-year">{machine.properties.year}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground text-xs">Conector:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {connectors.map((conn: string) => (
                          <Badge key={conn} variant="secondary" className="text-xs">{conn}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="events">Eventos</TabsTrigger>
              <TabsTrigger value="edit">Editar Datos</TabsTrigger>
            </TabsList>

            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Últimos Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay eventos registrados
                    </div>
                  ) : (
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
                          {recentEvents.map((event: any, idx: number) => (
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edit">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="machine-name">Nombre (Opcional)</Label>
                      <Input
                        id="machine-name"
                        placeholder="ej: CNC-001"
                        value={machineName}
                        onChange={(e) => setMachineName(e.target.value)}
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
                            className={`cursor-pointer hover-elevate ${isSelected ? "bg-primary text-primary-foreground" : ""
                              }`}
                            onClick={() => handleConnectorToggle(connector)}
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
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`event-label-${index}`}>Etiqueta (Opcional)</Label>
                              <Input
                                id={`event-label-${index}`}
                                placeholder="ej: level_420"
                                value={event.label}
                                onChange={(e) => handleEventChange(index, 'label', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`event-class-${index}`}>Clase *</Label>
                              <Select
                                value={event.class}
                                onValueChange={(value) => handleEventChange(index, 'class', value)}
                              >
                                <SelectTrigger>
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
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`property-value-${index}`}>Valor</Label>
                              <Input
                                id={`property-value-${index}`}
                                placeholder="ej: 2500"
                                value={property.value}
                                onChange={(e) => handlePropertyChange(index, 'value', e.target.value)}
                              />
                            </div>
                          </div>
                          {properties.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveProperty(index)}
                              className="mt-8"
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

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
