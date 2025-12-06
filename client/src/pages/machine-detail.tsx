import { useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
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
import { Plus, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";

const DEFAULT_ORG_ID = 'autentiodev';

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

  const applicationId = params?.applicationId;
  const eui = params?.eui;

  // Fetch device data
  const { data: device, isLoading, error } = useQuery<any>({
    queryKey: [`/api/organizations/${DEFAULT_ORG_ID}/applications/${applicationId}/devices/${eui}`],
    enabled: !!applicationId && !!eui,
  });

  // Fetch application data for breadcrumb
  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ['/api/organizations', DEFAULT_ORG_ID, 'applications'],
  });

  // Fetch latest events from InfluxDB
  const eventsPath = useMemo(() => {
    if (!eui) return null;
    return `/device/${eui}/events`;
  }, [eui]);

  const { data: influxEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: eventsPath ? [eventsPath] : ['events-disabled'],
    enabled: !!eventsPath,
  });
  const statusPath = useMemo(() => {
    if (!eui) return null;
    return `/device/${eui}/status`;
  }, [eui]);

  const { data: statusData } = useQuery<any>({
    queryKey: statusPath ? [statusPath] : ['status-disabled'],
    enabled: !!statusPath,
  });

  // Form State
  const [machineName, setMachineName] = useState("");
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const [events, setEvents] = useState<MachineEvent[]>([{ id: "", label: "", class: "" }]);
  const [properties, setProperties] = useState<MachineProperty[]>([{ key: "", value: "" }]);
  const [machineIP, setMachineIP] = useState("");
  const [machinePort, setMachinePort] = useState("");
  const [machineImageUrl, setMachineImageUrl] = useState("");

  // Initialize form when device data loads
  useEffect(() => {
    if (device) {
      setMachineName(device.name || "");
      setSelectedConnectors(device.connectors || []);

      if (device.events && device.events.length > 0) {
        setEvents(device.events.map((e: any) => ({
          id: e.id || "",
          label: e.label || "",
          class: e.class || ""
        })));
      }

      const props = device.properties || {};
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
  }, [device]);

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
      const res = await apiRequest(
        'PUT',
        `/api/organizations/${DEFAULT_ORG_ID}/applications/${applicationId}/devices/${eui}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${DEFAULT_ORG_ID}/applications/${applicationId}/devices/${eui}`] });
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

  if (!applicationId || !eui) {
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

  if (error || !device) {
    return (
      <div className="p-10">
        <p>Máquina no encontrada</p>
      </div>
    );
  }

  const connectors = device.connectors || [];
  const machineType = isCNC(connectors) ? "CNC" : isRobot(connectors) ? "Robot" : null;
  const primaryConnector = connectors.find((c: string) => CNC_CONNECTORS.includes(c) || ROBOT_CONNECTORS.includes(c)) || connectors[0] || "Unknown";
  const application = applications.find((app: any) => app.applicationId === applicationId);

  // Determine which image to use: custom image URL or default based on machine type
  const defaultImage = machineType === "CNC" ? cncImage : robotImage;
  const machineImage = device.properties?.imageUrl || defaultImage;
  console.log(machineImage);

  // Get status from API - power value: true = CONECTADA, false = DESCONECTADA
  // Only trust statusData.power if it's explicitly true or false
  // If statusData exists but power is undefined/null, default to DESCONECTADA
  let machineStatus = "DESCONECTADA";
  if (statusData && typeof statusData.power === 'boolean') {
    machineStatus = statusData.power === true ? "CONECTADA" : "DESCONECTADA";
  } else if (statusData === null || statusData === undefined) {
    // Only use device properties as fallback if statusData doesn't exist at all
    machineStatus = device.properties?.status || "DESCONECTADA";
  }

  // Format events for display
  const recentEventsSource = Array.isArray(influxEvents) && influxEvents.length ? influxEvents : (device.events || []);
  const recentEvents = recentEventsSource.slice(0, 10).map((event: any, idx: number) => {
    if (event.event_id || event.event_value) {
      // Convert timestamp to Date and format
      let timestamp = '-';
      if (event.time) {
        try {
          const timeValue = typeof event.time === 'number' ? event.time : Number(event.time);
          let timeMs: number;

          // Determine the format based on the magnitude
          // Current Unix timestamps (2024-2025) in milliseconds are ~1.7e12
          // Microseconds would be ~1.7e15, nanoseconds would be ~1.7e18
          // So: > 1e18 = nanoseconds, > 1e15 = microseconds, otherwise = milliseconds
          if (timeValue > 1e18) {
            timeMs = timeValue / 1000000; // nanoseconds to milliseconds
          } else if (timeValue > 1e15) {
            timeMs = timeValue / 1000; // microseconds to milliseconds
          } else {
            timeMs = timeValue; // already in milliseconds
          }

          const date = new Date(timeMs);
          // Format as full datetime: DD/MM/YYYY HH:MM:SS
          timestamp = date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (e) {
          console.error('Error parsing timestamp:', e);
          timestamp = new Date().toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        }
      }

      return {
        timestamp,
        id: event.event_id || `evt_${idx}`,
        content: event.event_class || 'EVENTO',
        value: event.event_value ?? event.payload ?? '-'
      };
    }

    return {
      timestamp: new Date(device.updatedAt || Date.now() - idx * 5000).toLocaleString('es-ES', {
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
    };
  });

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / Aplicaciones / {application?.name || applicationId} / <span className="text-foreground">{device.name || eui}</span>
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
            {device.name || eui}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {eui}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <img
                src={machineImage}
                alt={device.name || eui}
                className="w-full h-auto"
                data-testid="img-machine"
                onError={(e) => {
                  // Fallback to default image if custom image fails to load
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
                {device.properties?.ip && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Datos de Red</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">IP</div>
                        <div className="font-mono text-sm" data-testid="text-ip">{device.properties.ip}</div>
                      </div>
                      {device.properties.port && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">PUERTO</div>
                          <div className="font-mono text-sm">{device.properties.port}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {device.properties?.workOrder && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Orden de Trabajo</h3>
                    <div className="font-mono text-sm" data-testid="text-work-order">
                      {device.properties.workOrder}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Propiedades</h3>
                  <div className="space-y-2 text-sm">
                    {device.properties?.manufacturer && (
                      <div>
                        <span className="text-muted-foreground text-xs">Fabricante:</span>
                        <div className="font-medium text-sm mt-1" data-testid="text-manufacturer">{device.properties.manufacturer}</div>
                      </div>
                    )}
                    {device.properties?.model && (
                      <div>
                        <span className="text-muted-foreground text-xs">Modelo:</span>
                        <div className="font-medium text-sm mt-1" data-testid="text-model">{device.properties.model}</div>
                      </div>
                    )}
                    {device.properties?.year && (
                      <div>
                        <span className="text-muted-foreground text-xs">Año:</span>
                        <div className="font-medium text-sm mt-1" data-testid="text-year">{device.properties.year}</div>
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
                  {eventsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Cargando eventos...
                    </div>
                  ) : recentEvents.length === 0 ? (
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
