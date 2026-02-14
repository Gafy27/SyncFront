import { ChangeEvent, useState, useMemo } from "react";
import { Plus, Code, Save, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApplicationFunctionsTabProps {
  selectedOrg: string | null;
  selectedApp: string | null;
  machines: any[];
  eventClasses: any[];
}

export function ApplicationFunctionsTab({
  selectedOrg,
  selectedApp,
  machines,
  eventClasses,
}: ApplicationFunctionsTabProps) {
  const [newFunction, setNewFunction] = useState({
    name: "",
    type: "Algebraic Function", // "Algebraic Function" or "Counter"
    expression: "",
    events: [] as Array<{ type?: "event" | "property"; eventClass?: string; property?: string; event?: string; machineId?: string; name: string }>,
    counter: {
      name: "",
      eventClass: "",
    },
    description: "",
  });
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({
    type: "event" as "event" | "property", // "event" or "property"
    eventClass: "", // Selected event class (if type is "event")
    property: "", // Selected property key (if type is "property")
    name: "", // Variable name
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch functions for selected app
  const { data: functions = [], isLoading: functionsLoading } = useQuery<any[]>({
    queryKey: selectedOrg && selectedApp ? ['/api/applications', selectedOrg, 'applications', selectedApp, 'functions'] : ['functions-disabled'],
    enabled: !!selectedOrg && !!selectedApp,
  });

  // Fetch all properties from all machines in the application
  const { data: allProperties = [] } = useQuery<any[]>({
    queryKey: selectedOrg && selectedApp ? ['/api/organizations', selectedOrg, 'applications', selectedApp, 'properties'] : ['properties-disabled'],
    enabled: !!selectedOrg && !!selectedApp && newEvent.type === "property",
  });

  const addFunctionMutation = useMutation({
    mutationFn: async (functionData: any) => {
      if (!selectedOrg || !selectedApp) {
        throw new Error("Organización y aplicación deben estar seleccionadas");
      }
      const response = await apiRequest(
        'POST',
        `/api/applications/${selectedOrg}/applications/${selectedApp}/functions`,
        functionData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/applications', selectedOrg, 'applications', selectedApp, 'functions']
      });
      setNewFunction({ name: "", type: "Algebraic Function", expression: "", events: [], counter: { name: "", eventClass: "" }, description: "" });
      setEditingFunctionId(null);
      toast({
        title: "Éxito",
        description: "Función agregada correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al agregar la función",
        variant: "destructive",
      });
    }
  });

  const updateFunctionMutation = useMutation({
    mutationFn: async ({ functionId, functionData }: { functionId: string; functionData: any }) => {
      if (!selectedOrg || !selectedApp) {
        throw new Error("Organización y aplicación deben estar seleccionadas");
      }
      const response = await apiRequest(
        'PUT',
        `/api/applications/${selectedOrg}/applications/${selectedApp}/functions/${functionId}`,
        functionData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/applications', selectedOrg, 'applications', selectedApp, 'functions']
      });
      setNewFunction({ name: "", type: "Algebraic Function", expression: "", events: [], counter: { name: "", eventClass: "" }, description: "" });
      setEditingFunctionId(null);
      toast({
        title: "Éxito",
        description: "Función actualizada correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la función",
        variant: "destructive",
      });
    }
  });

  const deleteFunctionMutation = useMutation({
    mutationFn: async (functionId: string) => {
      if (!selectedOrg || !selectedApp) {
        throw new Error("Organización y aplicación deben estar seleccionadas");
      }
      const response = await apiRequest(
        'DELETE',
        `/api/applications/${selectedOrg}/applications/${selectedApp}/functions/${functionId}`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/applications', selectedOrg, 'applications', selectedApp, 'functions']
      });
      toast({
        title: "Éxito",
        description: "Función eliminada correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la función",
        variant: "destructive",
      });
    }
  });

  const handleOpenAddEventDialog = (index?: number) => {
    if (index !== undefined) {
      setEditingEventIndex(index);
      const existingEvent = newFunction.events[index];
      setNewEvent({
        type: existingEvent.type || (existingEvent.property ? "property" : "event"),
        eventClass: existingEvent.eventClass || existingEvent.event || "",
        property: existingEvent.property || "",
        name: existingEvent.name || "",
      });
    } else {
      setEditingEventIndex(null);
      setNewEvent({ type: "event", eventClass: "", property: "", name: "" });
    }
    setIsAddEventDialogOpen(true);
  };

  const handleSaveEvent = () => {
    if (!newEvent.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive",
      });
      return;
    }
    
    if (newEvent.type === "event") {
      if (!newEvent.eventClass.trim()) {
        toast({
          title: "Error",
          description: "Debe seleccionar una clase de evento",
          variant: "destructive",
        });
        return;
      }
    } else if (newEvent.type === "property") {
      if (!newEvent.property.trim()) {
        toast({
          title: "Error",
          description: "Debe seleccionar una propiedad",
          variant: "destructive",
        });
        return;
      }
    }

    const eventData = {
      type: newEvent.type,
      eventClass: newEvent.type === "event" ? newEvent.eventClass : undefined,
      property: newEvent.type === "property" ? newEvent.property : undefined,
      event: newEvent.type === "event" ? newEvent.eventClass : undefined, // Keep for backward compatibility
      name: newEvent.name,
    };

    if (editingEventIndex !== null) {
      setNewFunction(prev => ({
        ...prev,
        events: prev.events.map((e, i) => i === editingEventIndex ? eventData : e)
      }));
    } else {
      setNewFunction(prev => ({
        ...prev,
        events: [...prev.events, eventData]
      }));
    }
    setIsAddEventDialogOpen(false);
    setNewEvent({ type: "event", eventClass: "", property: "", name: "" });
    setEditingEventIndex(null);
  };

  const handleRemoveEvent = (index: number) => {
    setNewFunction(prev => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index)
    }));
  };

  const handleAddFunction = () => {
    if (!newFunction.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive",
      });
      return;
    }
    
    if (newFunction.type === "Algebraic Function") {
      if (newFunction.events.length === 0) {
        toast({
          title: "Error",
          description: "Debe agregar al menos una variable",
          variant: "destructive",
        });
        return;
      }
      if (!newFunction.expression.trim()) {
        toast({
          title: "Error",
          description: "La expresión es requerida",
          variant: "destructive",
        });
        return;
      }
    } else if (newFunction.type === "Counter") {
      if (!newFunction.counter.name.trim()) {
        toast({
          title: "Error",
          description: "El nombre del contador es requerido",
          variant: "destructive",
        });
        return;
      }
      if (!newFunction.counter.eventClass.trim()) {
        toast({
          title: "Error",
          description: "Debe seleccionar una clase de evento para el contador",
          variant: "destructive",
        });
        return;
      }
    }
    
    const functionData = {
      ...newFunction,
      variables: newFunction.type === "Algebraic Function" ? newFunction.events.map(e => e.name) : [],
      // Only include counter if type is Counter
      counter: newFunction.type === "Counter" ? newFunction.counter : undefined,
      // For Counter, use counter name as expression; for Algebraic Function, use the expression
      expression: newFunction.type === "Counter" ? newFunction.counter.name : newFunction.expression,
      // Keep events array with type information
      events: newFunction.type === "Algebraic Function" ? newFunction.events : [],
    };
    
    if (editingFunctionId) {
      updateFunctionMutation.mutate({ functionId: editingFunctionId, functionData });
    } else {
      addFunctionMutation.mutate(functionData);
    }
  };

  const handleEditFunction = (func: any) => {
    const events = func.events && func.events.length > 0 
      ? func.events 
      : (func.variables || []).map((varName: string) => ({ 
          name: varName, 
          machineId: "", 
          event: "" 
        }));
    
    setNewFunction({
      name: func.name || "",
      type: func.type || "Algebraic Function",
      expression: func.expression || "",
      events: events,
      counter: func.counter || { name: "", eventClass: "" },
      description: func.description || "",
    });
    setEditingFunctionId(func.id);
  };

  const handleCancelEdit = () => {
    setNewFunction({ name: "", type: "Algebraic Function", expression: "", events: [], counter: { name: "", eventClass: "" }, description: "" });
    setEditingFunctionId(null);
  };

  const handleDeleteFunction = (functionId: string) => {
    if (confirm("¿Está seguro de que desea eliminar esta función?")) {
      deleteFunctionMutation.mutate(functionId);
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-2">
            {editingFunctionId ? "Editar Función" : "Nueva Función"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {editingFunctionId 
              ? "Modifica los detalles de la función" 
              : "Crea una nueva función para procesar eventos"}
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <form className="grid gap-4 md:grid-cols-5" onSubmit={(e) => { e.preventDefault(); handleAddFunction(); }}>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-muted-foreground" htmlFor="function-name">Nombre *</label>
                <Input
                  id="function-name"
                  placeholder="ej: Calculo Temperatura"
                  value={newFunction.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewFunction({ ...newFunction, name: e.target.value })}
                  data-testid="input-function-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground" htmlFor="function-type">Tipo *</label>
                <Select
                  value={newFunction.type}
                  onValueChange={(value) => {
                    setNewFunction({ 
                      ...newFunction, 
                      type: value,
                      // Reset fields when switching types
                      expression: value === "Counter" ? "" : newFunction.expression,
                      events: value === "Counter" ? [] : newFunction.events,
                      counter: value === "Algebraic Function" ? { name: "", eventClass: "" } : newFunction.counter,
                    });
                  }}
                >
                  <SelectTrigger id="function-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Algebraic Function">Función Personalizada</SelectItem>
                    <SelectItem value="Counter">Contador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newFunction.type === "Algebraic Function" && (
                <>
                  <div className="space-y-2 md:col-span-5">
                    <label className="text-xs text-muted-foreground">Variable *</label>
                    {newFunction.events.map((event, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <Input
                          placeholder="temp"
                          value={event.name}
                          disabled
                          className="flex-1"
                        />
                        <Badge variant="outline" className="text-xs">
                          {event.type === "event" ? "Evento" : "Propiedad"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {event.type === "event" ? (event.eventClass || event.event) : event.property}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenAddEventDialog(idx)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveEvent(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenAddEventDialog()}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Variable
                    </Button>
                  </div>
                  <div className="space-y-2 md:col-span-5">
                    <label className="text-xs text-muted-foreground" htmlFor="function-expression">Expresión *</label>
                    <Textarea
                      id="function-expression"
                      placeholder="ej: temp * 1.8 + 32"
                      value={newFunction.expression}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewFunction({ ...newFunction, expression: e.target.value })}
                      className="font-mono min-h-[100px]"
                      data-testid="input-function-expression"
                    />
                  </div>
                </>
              )}
              {newFunction.type === "Counter" && (
                <div className="space-y-2 md:col-span-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground" htmlFor="counter-name">Nombre del Contador *</label>
                      <Input
                        id="counter-name"
                        placeholder="ej: contador_produccion"
                        value={newFunction.counter.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewFunction({ 
                          ...newFunction, 
                          counter: { ...newFunction.counter, name: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground" htmlFor="counter-event-class">Clase de Evento que Incrementa *</label>
                      <Select
                        value={newFunction.counter.eventClass}
                        onValueChange={(value) => setNewFunction({ 
                          ...newFunction, 
                          counter: { ...newFunction.counter, eventClass: value }
                        })}
                      >
                        <SelectTrigger id="counter-event-class">
                          <SelectValue placeholder="Seleccionar clase de evento" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventClasses.length > 0 ? (
                            eventClasses.map((eventClass: any) => (
                              <SelectItem key={eventClass.id || eventClass.class} value={eventClass.class || eventClass.className}>
                                {eventClass.class || eventClass.className}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>No hay clases de eventos disponibles</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {newFunction.counter.name && newFunction.counter.eventClass && (
                    <div className="mt-2 p-2 bg-muted rounded-md text-xs text-muted-foreground">
                      El contador <code className="font-mono">{newFunction.counter.name}</code> se incrementará cuando ocurra el evento <code className="font-mono">{newFunction.counter.eventClass}</code>
                    </div>
                  )}
                </div>
              )}
              <div className="md:col-span-5 flex items-end gap-2">
                {editingFunctionId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={addFunctionMutation.isPending || updateFunctionMutation.isPending || !selectedOrg || !selectedApp}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  data-testid="button-add-function"
                  disabled={addFunctionMutation.isPending || updateFunctionMutation.isPending || !selectedOrg || !selectedApp}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {addFunctionMutation.isPending || updateFunctionMutation.isPending 
                    ? "Guardando..." 
                    : editingFunctionId 
                      ? "Actualizar" 
                      : "Guardar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      {functionsLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando funciones...
        </div>
      ) : functions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay funciones registradas
        </div>
      ) : (
        <div className="space-y-3">
          {functions.map((func) => (
            <Card key={func.id} className="hover-elevate" data-testid={`card-function-${func.id}`}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Code className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold font-mono">{func.name}</h3>
                      {func.description && (
                        <p className="text-sm text-muted-foreground mt-1">{func.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>Tipo: {func.type || 'Algebraic Function'}</span>
                        <span>•</span>
                        <span>Expresión: <code className="font-mono bg-muted px-1 rounded">{func.expression}</code></span>
                      </div>
                      {func.counter && func.counter.name && func.counter.eventClass && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Contador:</span> <code className="font-mono bg-muted px-1 rounded">{func.counter.name}</code> 
                          <span className="mx-1">→</span>
                          <span>Se incrementa con: <code className="font-mono bg-muted px-1 rounded">{func.counter.eventClass}</code></span>
                        </div>
                      )}
                      {func.events && func.events.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {func.events.map((event: any, idx: number) => {
                            const eventType = event.type || (event.property ? "property" : "event");
                            return (
                              <div key={idx} className="text-xs text-muted-foreground">
                                <span className="font-medium">{event.name}</span>
                                <span className="mx-1">•</span>
                                <Badge variant="outline" className="text-xs mr-1">
                                  {eventType === "property" ? "Propiedad" : "Evento"}
                                </Badge>
                                <code className="font-mono bg-muted px-1 rounded text-xs">
                                  {eventType === "property" ? event.property : (event.eventClass || event.event)}
                                </code>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {func.variables && func.variables.length > 0 && !func.events && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {func.variables.map((varName: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {varName}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditFunction(func)}
                      disabled={editingFunctionId === func.id || deleteFunctionMutation.isPending}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteFunction(func.id)}
                      disabled={deleteFunctionMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEventIndex !== null ? "Editar Variable" : "Agregar Variable"}</DialogTitle>
            <DialogDescription>
              Selecciona el tipo y configura la variable
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">Tipo *</Label>
              <Select
                value={newEvent.type}
                onValueChange={(value: "event" | "property") => {
                  setNewEvent({ 
                    ...newEvent, 
                    type: value,
                    eventClass: value === "property" ? "" : newEvent.eventClass,
                    property: value === "event" ? "" : newEvent.property,
                  });
                }}
              >
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="property">Propiedad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newEvent.type === "event" && (
              <div className="space-y-2">
                <Label htmlFor="event-event-class">Clase de Evento *</Label>
                <Select
                  value={newEvent.eventClass}
                  onValueChange={(value) => setNewEvent({ ...newEvent, eventClass: value })}
                >
                  <SelectTrigger id="event-event-class">
                    <SelectValue placeholder="Seleccionar clase de evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventClasses.length > 0 ? (
                      eventClasses
                        .filter((ec: any) => {
                          const value = ec.class || ec.className;
                          return value && value.trim() !== "";
                        })
                        .map((eventClass: any) => (
                          <SelectItem key={eventClass.id || eventClass.class} value={eventClass.class || eventClass.className}>
                            {eventClass.class || eventClass.className}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay clases de eventos disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {newEvent.type === "property" && (
              <div className="space-y-2">
                <Label htmlFor="event-property">Propiedad *</Label>
                <Select
                  value={newEvent.property}
                  onValueChange={(value) => setNewEvent({ ...newEvent, property: value })}
                >
                  <SelectTrigger id="event-property">
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProperties.length > 0 ? (
                      allProperties
                        .filter((prop: any) => prop.key && prop.key.trim() !== "")
                        .map((prop: any) => (
                          <SelectItem key={prop.key} value={prop.key}>
                            <div className="flex flex-col">
                              <span className="font-mono">{prop.key}</span>
                              {prop.machines && prop.machines.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {prop.machines.length} máquina{prop.machines.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay propiedades disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="event-name">Nombre *</Label>
              <Input
                id="event-name"
                placeholder="ej: temp"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddEventDialogOpen(false);
                  setNewEvent({ type: "event", eventClass: "", property: "", name: "" });
                  setEditingEventIndex(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEvent}>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

