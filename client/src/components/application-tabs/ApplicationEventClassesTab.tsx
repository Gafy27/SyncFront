import { ChangeEvent, useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApplicationEventClassesTabProps {
  selectedOrg: string | null;
  selectedApp: string | null;
}

export function ApplicationEventClassesTab({
  selectedOrg,
  selectedApp,
}: ApplicationEventClassesTabProps) {
  const [newEventClass, setNewEventClass] = useState({
    className: "",
    topic: "",
    type: "STR",
    authValues: [] as string[],
    valuesRange: { min: "", max: "" },
  });
  const [newAuthValue, setNewAuthValue] = useState("");
  const [eventClassError, setEventClassError] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch event classes for selected app
  const { data: eventClasses = [], isLoading: eventClassesLoading } = useQuery<any[]>({
    queryKey: selectedOrg && selectedApp ? ['/api/applications', selectedOrg, 'applications', selectedApp, 'event-classes'] : ['event-classes-disabled'],
    enabled: !!selectedOrg && !!selectedApp,
  });

  const addEventClassMutation = useMutation({
    mutationFn: async (eventClassData: any) => {
      if (!selectedOrg || !selectedApp) {
        throw new Error("Organización y aplicación deben estar seleccionadas");
      }
      const response = await apiRequest(
        'POST',
        `/api/applications/${selectedOrg}/applications/${selectedApp}/event-classes`,
        eventClassData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/applications', selectedOrg, 'applications', selectedApp, 'event-classes']
      });
      setNewEventClass({ className: "", topic: "", type: "STR", authValues: [], valuesRange: { min: "", max: "" } });
      setNewAuthValue("");
      setEventClassError("");
      toast({
        title: "Éxito",
        description: "Clase de evento agregada correctamente",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Error al agregar la clase de evento";
      setEventClassError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleAddAuthValue = () => {
    if (newAuthValue.trim()) {
      setNewEventClass(prev => ({
        ...prev,
        authValues: [...prev.authValues, newAuthValue.trim()]
      }));
      setNewAuthValue("");
    }
  };

  const handleRemoveAuthValue = (index: number) => {
    setNewEventClass(prev => ({
      ...prev,
      authValues: prev.authValues.filter((_, i) => i !== index)
    }));
  };

  const handleAddEventClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedOrg || !selectedApp) {
      setEventClassError("Debe seleccionar una organización y una aplicación");
      return;
    }

    if (!newEventClass.className.trim() || !newEventClass.topic.trim()) {
      setEventClassError("El nombre de la clase y el topic son obligatorios");
      return;
    }

    const eventClassData: any = {
      className: newEventClass.className.trim(),
      topic: newEventClass.topic.trim(),
      type: newEventClass.type,
    };

    if (newEventClass.type === "STR" && newEventClass.authValues.length > 0) {
      eventClassData.auth_values = newEventClass.authValues;
    }

    if (newEventClass.type === "FLOAT" && newEventClass.valuesRange.min && newEventClass.valuesRange.max) {
      eventClassData.values_range = [
        parseFloat(newEventClass.valuesRange.min),
        parseFloat(newEventClass.valuesRange.max)
      ];
    }

    addEventClassMutation.mutate(eventClassData);
  };

  return (
    <>
      <div className="mb-6">
        <Card>
          <CardContent className="p-6">
            <form className="grid gap-4 md:grid-cols-5" onSubmit={handleAddEventClass}>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-muted-foreground" htmlFor="class-name">Nombre de la Clase *</label>
                <Input
                  id="class-name"
                  placeholder="ej: EXECUTION"
                  value={newEventClass.className}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewEventClass({ ...newEventClass, className: e.target.value })}
                  data-testid="input-event-class-name"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-muted-foreground" htmlFor="class-topic">Topic *</label>
                <Input
                  id="class-topic"
                  placeholder="ej: accepted"
                  value={newEventClass.topic}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewEventClass({ ...newEventClass, topic: e.target.value })}
                  data-testid="input-event-class-topic"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground" htmlFor="class-type">Tipo</label>
                <select
                  id="class-type"
                  value={newEventClass.type}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewEventClass({ ...newEventClass, type: e.target.value, authValues: [], valuesRange: { min: "", max: "" } })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="STR">Texto</option>
                  <option value="INT">Entero</option>
                  <option value="FLOAT">Decimal</option>
                  <option value="BOOL">Boolean</option>
                </select>
              </div>
              {newEventClass.type === "STR" && (
                <div className="space-y-2 md:col-span-4">
                  <label className="text-xs text-muted-foreground">Valores autorizados (auth_values)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ej: SETUP"
                      value={newAuthValue}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAuthValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAuthValue();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddAuthValue} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {newEventClass.authValues.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newEventClass.authValues.map((value, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          {value}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => handleRemoveAuthValue(idx)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {newEventClass.type === "FLOAT" && (
                <div className="space-y-2 md:col-span-4">
                  <label className="text-xs text-muted-foreground">Rango de valores (values_range)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        placeholder="Mínimo (ej: 4.1)"
                        type="number"
                        step="0.1"
                        value={newEventClass.valuesRange.min}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewEventClass({ ...newEventClass, valuesRange: { ...newEventClass.valuesRange, min: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Máximo (ej: 19.9)"
                        type="number"
                        step="0.1"
                        value={newEventClass.valuesRange.max}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewEventClass({ ...newEventClass, valuesRange: { ...newEventClass.valuesRange, max: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="md:col-span-5 flex items-end">
                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  data-testid="button-add-event-class"
                  disabled={addEventClassMutation.isPending || !selectedOrg || !selectedApp}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addEventClassMutation.isPending ? "Guardando..." : "Guardar Clase"}
                </Button>
              </div>
            </form>
            {eventClassError && (
              <p className="text-sm text-destructive mt-2">{eventClassError}</p>
            )}
            {addEventClassMutation.isPending && (
              <p className="text-sm text-muted-foreground mt-2">Guardando...</p>
            )}
          </CardContent>
        </Card>
      </div>
      {eventClassesLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando clases de eventos...
        </div>
      ) : (
        <div className="space-y-3">
          {eventClasses.map((eventClass) => (
            <Card key={eventClass.id || eventClass.class} className="hover-elevate" data-testid={`card-event-class-${eventClass.id || eventClass.class}`}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold font-mono">{eventClass.class || eventClass.className}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>Topic: {eventClass.topic}</span>
                        <span>•</span>
                        <span>Type: {eventClass.type}</span>
                      </div>
                      {(eventClass as any).auth_values && (eventClass as any).auth_values.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(eventClass as any).auth_values.map((value: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(eventClass as any).values_range && (eventClass as any).values_range.length === 2 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Rango: ({(eventClass as any).values_range[0]}, {(eventClass as any).values_range[1]})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

