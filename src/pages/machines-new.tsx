import { useState } from "react";
import { useLocation } from "wouter";
import { Save, ArrowLeft, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { machines as machinesApi, events as eventsApi, connectorTemplates as connectorTemplatesApi, bridges as bridgesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import type { OrgEvent, Bridge } from "@/lib/types";

interface DriverVariable {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  default?: any;
}

interface DriverTemplate {
  id: string;
  name: string;
  slug: string;
  type: string;
  icon?: string | null;
  variables: DriverVariable[];
}

interface DriverConfig {
  uid: string;
  templateId: string;
  templateType: string;
  name: string;
  slug: string;
  variables: DriverVariable[];
  config: Record<string, string>;
  bridgeId?: string;
}

function normalizeVariables(vars: any): DriverVariable[] {
  if (Array.isArray(vars)) return vars;
  if (vars && typeof vars === "object") {
    return Object.entries(vars).map(([name, def]: [string, any]) => ({
      name,
      type: typeof def === "object" ? def.type || "string" : typeof def,
      label: name,
      default: typeof def === "object" ? def.default : def,
    }));
  }
  return [];
}

export default function NewMachine() {
  const [, setLocation] = useLocation();
  const { selectedOrg } = useOrganization();
  const { toast } = useToast();

  const [machineName, setMachineName] = useState("");
  const [driverConfigs, setDriverConfigs] = useState<DriverConfig[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [properties, setProperties] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: orgEvents = [], isLoading: isLoadingEvents } = useQuery<OrgEvent[]>({
    queryKey: ["organizations", selectedOrg, "events"],
    queryFn: async () => {
      const res = await eventsApi.list(selectedOrg!);
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object") {
        const o = res as Record<string, unknown>;
        const key = Object.keys(o).find((k) => Array.isArray(o[k]));
        if (key) return o[key] as OrgEvent[];
      }
      return [];
    },
    enabled: !!selectedOrg,
  });

  const { data: driverTemplates = [] } = useQuery<DriverTemplate[]>({
    queryKey: ["/api/connector-templates"],
    queryFn: async () => {
      const res = await connectorTemplatesApi.list();
      const items = Array.isArray(res) ? res : (res as any)?.items || [];
      return items
        .filter((t: any) => ["DRIVER", "SELECT"].includes(t.type?.toUpperCase()))
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          type: t.type || "",
          icon: t.icon,
          variables: normalizeVariables(t.variables),
        }));
    },
  });

  const { data: orgBridges = [] } = useQuery<Bridge[]>({
    queryKey: ["organizations", selectedOrg, "bridges"],
    queryFn: async () => {
      const res = await bridgesApi.list(selectedOrg!);
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object") {
        const o = res as Record<string, unknown>;
        const key = Object.keys(o).find((k) => Array.isArray(o[k]));
        if (key) return o[key] as Bridge[];
      }
      return [];
    },
    enabled: !!selectedOrg,
  });

  const handleAddDriver = () => {
    const tpl = driverTemplates.find((t) => t.id === selectedDriverId);
    if (!tpl) return;
    const initial: Record<string, string> = {};
    tpl.variables.forEach((v) => {
      initial[v.name] = v.default != null ? String(v.default) : "";
    });
    setDriverConfigs((prev) => [
      ...prev,
      {
        uid: Math.random().toString(36).slice(2),
        templateId: tpl.id,
        templateType: tpl.type,
        name: tpl.name,
        slug: tpl.slug,
        variables: tpl.variables,
        config: initial,
      },
    ]);
    setSelectedDriverId("");
  };

  const setBridgeForDriver = (uid: string, bridgeId: string) => {
    setDriverConfigs((prev) =>
      prev.map((d) => (d.uid === uid ? { ...d, bridgeId } : d))
    );
  };

  const removeDriver = (uid: string) => {
    setDriverConfigs((prev) => prev.filter((d) => d.uid !== uid));
  };

  const updateDriverConfig = (uid: string, key: string, value: string) => {
    setDriverConfigs((prev) =>
      prev.map((d) => (d.uid === uid ? { ...d, config: { ...d.config, [key]: value } } : d))
    );
  };

  const toggleEvent = (eventName: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventName) ? prev.filter((e) => e !== eventName) : [...prev, eventName]
    );
  };

  const addProperty = () => setProperties((prev) => [...prev, { key: "", value: "" }]);
  const removeProperty = (i: number) => setProperties((prev) => prev.filter((_, idx) => idx !== i));
  const updateProperty = (i: number, field: "key" | "value", val: string) =>
    setProperties((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));

  const handleSave = async () => {
    if (!selectedOrg) {
      toast({ title: "Error", description: "Selecciona una organización", variant: "destructive" });
      return;
    }
    if (!machineName.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }

    try {
      const propsDict = Object.fromEntries(
        properties.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p.value])
      );
      await machinesApi.create(selectedOrg, {
        name: machineName.trim(),
        connectors: driverConfigs.map((d) =>
          d.templateType.toUpperCase() === "DRIVER"
            ? { template_id: d.templateId, config: d.config }
            : { template_id: d.templateId, config: { id: d.bridgeId } }
        ),
        events: selectedEvents,
        properties: Object.keys(propsDict).length > 0 ? propsDict : undefined,
      });

      await queryClient.invalidateQueries({
        queryKey: ["organizations", selectedOrg, "machines"],
      });

      toast({ title: "Éxito", description: "Máquina creada correctamente" });
      setLocation("/machines");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la máquina",
        variant: "destructive",
      });
    }
  };

  if (!selectedOrg) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">Selecciona una organización para crear una máquina.</p>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/machines")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Máquinas
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
              Nueva Máquina
            </h1>
            <p className="text-muted-foreground">Configura una nueva máquina en la organización</p>
          </div>
          <Button onClick={handleSave} data-testid="button-save-machine">
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="machine-name">Nombre *</Label>
              <Input
                id="machine-name"
                placeholder="ej: CNC Lathe #1"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                data-testid="input-machine-name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Connector Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Conectores de Máquina</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Seleccionar conector..." />
                  </SelectTrigger>
                  <SelectContent>
                    {driverTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddDriver}
                  disabled={!selectedDriverId}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {driverConfigs.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay conectores añadidos.</p>
            )}
            {driverConfigs.map((dc) => {
              const isDriver = dc.templateType.toUpperCase() === "DRIVER";
              const matchingBridges = orgBridges.filter((b) => b.type === dc.slug);
              return (
                <Card key={dc.uid} className="border-dashed">
                  <CardHeader className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm flex-1">{dc.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDriver(dc.uid)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {isDriver ? (
                    dc.variables.length > 0 && (
                      <CardContent className="py-3 space-y-3">
                        {dc.variables.map((v) => {
                          let type = "text";
                          if (v.type === "integer" || v.type === "number") type = "number";
                          if (
                            v.type === "password" ||
                            v.name.toLowerCase().includes("password") ||
                            v.name.toLowerCase().includes("token")
                          )
                            type = "password";
                          return (
                            <div key={v.name} className="space-y-1">
                              <Label htmlFor={`${dc.uid}-${v.name}`} className="text-xs">
                                {v.label ||
                                  v.name
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                {v.required && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              <Input
                                id={`${dc.uid}-${v.name}`}
                                type={type}
                                value={dc.config[v.name] ?? ""}
                                onChange={(e) => updateDriverConfig(dc.uid, v.name, e.target.value)}
                                placeholder={v.default != null ? String(v.default) : ""}
                                className="h-8 text-sm"
                              />
                            </div>
                          );
                        })}
                      </CardContent>
                    )
                  ) : (
                    <CardContent className="py-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Instancia guardada</Label>
                        <Select
                          value={dc.bridgeId || ""}
                          onValueChange={(val) => setBridgeForDriver(dc.uid, val)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Seleccionar instancia..." />
                          </SelectTrigger>
                          <SelectContent>
                            {matchingBridges.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                No hay instancias guardadas
                              </SelectItem>
                            ) : (
                              matchingBridges.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Events Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Eventos</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedEvents.length} seleccionado{selectedEvents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <p className="text-sm text-muted-foreground">Cargando eventos...</p>
            ) : orgEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay eventos disponibles.{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => setLocation("/events")}
                >
                  Crea uno primero.
                </button>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {orgEvents.map((ev) => {
                  const isSelected = selectedEvents.includes(ev.event);
                  return (
                    <Badge
                      key={ev.event}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer select-none font-mono"
                      onClick={() => toggleEvent(ev.event)}
                      data-testid={`badge-event-${ev.event}`}
                    >
                      {ev.event}
                      {ev.type && <span className="ml-1 opacity-60 text-xs">{ev.type}</span>}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Properties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Propiedades</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addProperty}>
                <Plus className="w-4 h-4 mr-1" />
                Añadir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Label>Clave</Label>
              <Label>Valor</Label>
            </div>
            {properties.map((prop, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 items-center">
                <Input
                  placeholder="ej: location"
                  value={prop.key}
                  onChange={(e) => updateProperty(index, "key", e.target.value)}
                  className="font-mono"
                />
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="ej: Hall A"
                    value={prop.value}
                    onChange={(e) => updateProperty(index, "value", e.target.value)}
                    className="font-mono"
                  />
                  {properties.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeProperty(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => setLocation("/machines")} data-testid="button-cancel">
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
