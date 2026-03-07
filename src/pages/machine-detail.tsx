import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { machines as machinesApi, events as eventsApi, connectorTemplates as connectorTemplatesApi, bridges as bridgesApi } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@/providers/organization-provider";
import { getConnectorIconUrl } from "@/utils/connectorIcons";
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
  icon?: string | null;
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

export default function MachineDetail() {
  const [, params] = useRoute<{ machineId: string }>("/machines/:machineId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();

  const machineId = params?.machineId;

  const [machineName, setMachineName] = useState("");
  const [driverConfigs, setDriverConfigs] = useState<DriverConfig[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [properties, setProperties] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const initializedFor = useRef<string | null>(null);

  const { data: machine, isLoading, error } = useQuery<any>({
    queryKey: ["organizations", selectedOrg, "machines", machineId],
    queryFn: () => machinesApi.get(selectedOrg!, machineId!),
    enabled: !!selectedOrg && !!machineId,
  });

  const { data: orgEvents = [] } = useQuery<OrgEvent[]>({
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

  useEffect(() => {
    if (!machine) return;
    if (initializedFor.current === machineId) return;
    const existingConnectors = machine.connectors || [];
    if (existingConnectors.length > 0 && driverTemplates.length === 0) return;

    initializedFor.current = machineId ?? null;
    setMachineName(machine.name || "");
    setSelectedEvents(machine.events || []);
    const props =
      machine.properties && typeof machine.properties === "object"
        ? Object.entries(machine.properties).map(([key, value]) => ({ key, value: String(value ?? "") }))
        : [];
    setProperties(props.length > 0 ? props : [{ key: "", value: "" }]);

    setDriverConfigs(
      existingConnectors.map((c: any) => {
        const tpl = driverTemplates.find((t) => t.id === c.template_id);
        const isDriver = tpl?.type?.toUpperCase() === "DRIVER";
        return {
          uid: Math.random().toString(36).slice(2),
          templateId: c.template_id,
          templateType: tpl?.type || "DRIVER",
          name: tpl?.name || c.template_id,
          slug: tpl?.slug || "",
          icon: tpl?.icon,
          variables: tpl ? tpl.variables : [],
          config: isDriver
            ? Object.fromEntries(Object.entries(c.config || {}).map(([k, v]) => [k, String(v)]))
            : {},
          bridgeId: !isDriver ? (c.config?.id as string | undefined) : undefined,
        };
      })
    );
  }, [machine, machineId, driverTemplates]);

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
        icon: tpl.icon,
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

  const addProperty = () => setProperties((prev) => [...prev, { key: "", value: "" }]);
  const removeProperty = (i: number) => setProperties((prev) => prev.filter((_, idx) => idx !== i));
  const updateProperty = (i: number, field: "key" | "value", val: string) =>
    setProperties((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));

  const toggleEvent = (name: string) => {
    setSelectedEvents((prev) => (prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]));
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedOrg || !machineId) throw new Error("Missing org or machine ID");
      return machinesApi.update(selectedOrg, machineId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "machines", machineId] });
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "machines"] });
      toast({ title: "Éxito", description: "Máquina actualizada correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const propsDict = Object.fromEntries(
      properties.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p.value])
    );
    updateMutation.mutate({
      name: machineName.trim() || undefined,
      connectors: driverConfigs.map((d) =>
        d.templateType.toUpperCase() === "DRIVER"
          ? { template_id: d.templateId, config: d.config }
          : { template_id: d.templateId, config: { id: d.bridgeId } }
      ),
      events: selectedEvents,
      properties: Object.keys(propsDict).length > 0 ? propsDict : undefined,
    });
  };

  if (!machineId) return <div className="p-10"><p>Parámetros inválidos</p></div>;
  if (isLoading) return <div className="p-10"><p>Cargando máquina...</p></div>;
  if (error || !machine) return <div className="p-10"><p>Máquina no encontrada</p></div>;

  const machineStatus = machine.properties?.status || machine.status || "DESCONECTADA";

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / Máquinas / <span className="text-foreground">{machine.name || machineId}</span>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/machines")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold mb-1" data-testid="text-machine-name">
            {machine.name || machineId}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">{machineId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge
                variant="default"
                className={
                  machineStatus === "CONECTADA"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 w-full justify-center py-3 text-base"
                    : "bg-red-100 text-red-700 border-red-200 w-full justify-center py-3 text-base"
                }
                data-testid="badge-state"
              >
                {machineStatus}
              </Badge>
              {driverConfigs.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Drivers</p>
                  <div className="flex flex-wrap gap-1">
                    {driverConfigs.map((d) => (
                      <Badge key={d.uid} variant="secondary" className="text-xs">
                        {d.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvents.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Eventos</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedEvents.map((e) => (
                      <Badge key={e} variant="outline" className="text-xs font-mono">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right panel: edit form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="machine-name">Nombre</Label>
                <Input
                  id="machine-name"
                  placeholder="ej: CNC Lathe #1"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
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
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0">
                          <img
                            src={dc.icon?.startsWith("http") ? dc.icon : getConnectorIconUrl(dc.name, dc.slug)}
                            alt={dc.name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                          <div className="w-6 h-6 hidden items-center justify-center text-xs font-semibold">
                            {dc.name.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
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
              {orgEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay eventos disponibles.</p>
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
                      >
                        {ev.event}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
