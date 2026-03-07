import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { events as eventsApi } from "@/lib/api";
import type { OrgEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EventsTable } from "@/components/events-table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const EVENT_TYPES = ["FLOAT", "INT", "BOOL", "STR"] as const;

const formSchema = z.object({
  event: z.string().min(1, "Event name required"),
  type: z.string().optional(),
  values_range_min: z.string().optional(),
  values_range_max: z.string().optional(),
  authenticate: z.boolean().default(false),
  is_counter: z.boolean().default(false),
  remove_duplicates: z.boolean().default(false),
});
type FormData = z.infer<typeof formSchema>;

function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [authValues, setAuthValues] = useState<string[]>([]);
  const [authInput, setAuthInput] = useState("");
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      event: "",
      type: "FLOAT",
      values_range_min: "",
      values_range_max: "",
      authenticate: false,
      is_counter: false,
      remove_duplicates: false,
    },
  });

  const selectedType = watch("type");

  const addAuthValue = () => {
    const v = authInput.trim();
    if (v && !authValues.includes(v)) {
      setAuthValues((prev) => [...prev, v]);
    }
    setAuthInput("");
  };

  const removeAuthValue = (v: string) => {
    setAuthValues((prev) => prev.filter((x) => x !== v));
  };

  const createEvent = useMutation({
    mutationFn: (data: FormData) => {
      if (!selectedOrg) throw new Error("Organization required");
      const payload: Partial<OrgEvent> = {
        event: data.event,
        type: data.type || undefined,
        authenticate: data.authenticate,
        is_counter: data.is_counter,
        remove_duplicates: data.remove_duplicates,
      };
      if ((selectedType === "FLOAT" || selectedType === "INT")) {
        const min = data.values_range_min !== "" ? Number(data.values_range_min) : undefined;
        const max = data.values_range_max !== "" ? Number(data.values_range_max) : undefined;
        if (min !== undefined && max !== undefined) {
          payload.values_range = [min, max];
        }
      }
      if (selectedType === "STR" && authValues.length > 0) {
        (payload as any).auth_values = authValues;
      }
      if (import.meta.env.DEV) console.log("[API] POST events payload", payload);
      return eventsApi.create(selectedOrg, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "events"] });
      toast({ title: "Evento creado" });
      setOpen(false);
      reset();
      setAuthValues([]);
      setAuthInput("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setAuthValues([]); setAuthInput(""); } }}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-event">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Crear Evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => createEvent.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nombre del evento *</Label>
            <Input {...register("event")} placeholder="ej: power, temperature" className="font-mono" />
            {errors.event && <p className="text-sm text-destructive">{errors.event.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Tipo de dato</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Values range — only for FLOAT and INT */}
          {(selectedType === "FLOAT" || selectedType === "INT") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor mínimo</Label>
                <Input {...register("values_range_min")} type="number" placeholder="ej: 0" />
              </div>
              <div className="space-y-2">
                <Label>Valor máximo</Label>
                <Input {...register("values_range_max")} type="number" placeholder="ej: 200" />
              </div>
            </div>
          )}

          {/* Auth values — only for STRING */}
          {selectedType === "STR" && (
            <div className="space-y-2">
              <Label>Valores autorizados</Label>
              <p className="text-xs text-muted-foreground">Valores permitidos para este evento</p>
              <div className="flex gap-2">
                <Input
                  value={authInput}
                  onChange={(e) => setAuthInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAuthValue(); } }}
                  placeholder="ej: SETUP, RUN, STOP"
                  className="font-mono"
                />
                <Button type="button" variant="outline" size="sm" onClick={addAuthValue} disabled={!authInput.trim()}>
                  Add
                </Button>
              </div>
              {authValues.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {authValues.map((v) => (
                    <Badge key={v} variant="secondary" className="gap-1 pr-1 font-mono">
                      {v}
                      <button type="button" onClick={() => removeAuthValue(v)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Flags</Label>
            <Controller
              control={control}
              name="authenticate"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="authenticate" className="font-normal">Autenticación requerida</Label>
                    <p className="text-xs text-muted-foreground">El evento requiere autenticación</p>
                  </div>
                  <Switch
                    id="authenticate"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="is_counter"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_counter" className="font-normal">Es contador</Label>
                    <p className="text-xs text-muted-foreground">El valor es acumulativo</p>
                  </div>
                  <Switch
                    id="is_counter"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="remove_duplicates"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="remove_duplicates" className="font-normal">Quitar duplicados</Label>
                    <p className="text-xs text-muted-foreground">Eliminar eventos duplicados en ventana</p>
                  </div>
                  <Switch
                    id="remove_duplicates"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? "Creando..." : "Crear Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ─────────────────────────────────────────────

const editSchema = z.object({
  event: z.string().min(1, "Event name required"),
  type: z.string().optional(),
  values_range_min: z.string().optional(),
  values_range_max: z.string().optional(),
  authenticate: z.boolean().default(false),
  is_counter: z.boolean().default(false),
  remove_duplicates: z.boolean().default(false),
});
type EditFormData = z.infer<typeof editSchema>;

interface EditEventDialogProps {
  event: OrgEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditEventDialog({ event, open, onOpenChange }: EditEventDialogProps) {
  const [authValues, setAuthValues] = useState<string[]>([]);
  const [authInput, setAuthInput] = useState("");
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, reset, control, watch, setValue } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { event: "", type: "FLOAT", authenticate: false, is_counter: false, remove_duplicates: false },
  });

  const selectedType = watch("type");

  // Pre-fill form when dialog opens or event changes
  useEffect(() => {
    if (open && event) {
      reset({
        event: event.event,
        type: event.type || "FLOAT",
        values_range_min: event.values_range?.[0] !== undefined ? String(event.values_range[0]) : "",
        values_range_max: event.values_range?.[1] !== undefined ? String(event.values_range[1]) : "",
        authenticate: event.authenticate || false,
        is_counter: event.is_counter || false,
        remove_duplicates: event.remove_duplicates || false,
      });
      setAuthValues(event.auth_values || []);
      setAuthInput("");
    }
  }, [open, event, reset]);

  const addAuthValue = () => {
    const v = authInput.trim();
    if (v && !authValues.includes(v)) setAuthValues((prev) => [...prev, v]);
    setAuthInput("");
  };

  const updateEvent = useMutation({
    mutationFn: (data: EditFormData) => {
      if (!selectedOrg || !event?.id) throw new Error("Organization or event ID required");
      const payload: Record<string, unknown> = {
        event: data.event,
        type: data.type || undefined,
        authenticate: data.authenticate,
        is_counter: data.is_counter,
        remove_duplicates: data.remove_duplicates,
      };
      if (selectedType === "FLOAT" || selectedType === "INT") {
        const min = data.values_range_min !== "" ? Number(data.values_range_min) : undefined;
        const max = data.values_range_max !== "" ? Number(data.values_range_max) : undefined;
        if (min !== undefined && max !== undefined) payload.values_range = [min, max];
      } else if (selectedType === "STR" && authValues.length > 0) {
        payload.auth_values = authValues;
      }
      return eventsApi.update(selectedOrg, event.id!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "events"] });
      toast({ title: "Evento actualizado" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => updateEvent.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nombre del evento</Label>
            <Input {...register("event")} className="font-mono" />
          </div>

          <div className="space-y-2">
            <Label>Tipo de dato</Label>
            <Controller control={control} name="type" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>

          {(selectedType === "FLOAT" || selectedType === "INT") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor mínimo</Label>
                <Input {...register("values_range_min")} type="number" placeholder="ej: 0" />
              </div>
              <div className="space-y-2">
                <Label>Valor máximo</Label>
                <Input {...register("values_range_max")} type="number" placeholder="ej: 200" />
              </div>
            </div>
          )}

          {selectedType === "STR" && (
            <div className="space-y-2">
              <Label>Valores autorizados</Label>
              <div className="flex gap-2">
                <Input
                  value={authInput}
                  onChange={(e) => setAuthInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAuthValue(); } }}
                  placeholder="ej: SETUP, RUN, STOP"
                  className="font-mono"
                />
                <Button type="button" variant="outline" size="sm" onClick={addAuthValue} disabled={!authInput.trim()}>Add</Button>
              </div>
              {authValues.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {authValues.map((v) => (
                    <Badge key={v} variant="secondary" className="gap-1 pr-1 font-mono">
                      {v}
                      <button type="button" onClick={() => setAuthValues((p) => p.filter((x) => x !== v))} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Flags</Label>
            {(["authenticate", "is_counter", "remove_duplicates"] as const).map((field) => (
              <Controller key={field} control={control} name={field} render={({ field: f }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">
                      {field === "authenticate" ? "Autenticación requerida" : field === "is_counter" ? "Es contador" : "Quitar duplicados"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {field === "authenticate" ? "El evento requiere autenticación" : field === "is_counter" ? "El valor es acumulativo" : "Eliminar eventos duplicados en ventana"}
                    </p>
                  </div>
                  <Switch checked={f.value} onCheckedChange={f.onChange} />
                </div>
              )} />
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={updateEvent.isPending}>
              {updateEvent.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function EventsPage() {
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<OrgEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: orgEvents = [], isLoading, isError } = useQuery<OrgEvent[]>({
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

  const deleteEvent = useMutation({
    mutationFn: (eventId: string) => eventsApi.delete(selectedOrg!, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "events"] });
      toast({ title: "Evento eliminado" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!selectedOrg) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">Selecciona una organización para ver los eventos.</p>
      </div>
    );
  }

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Eventos</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Eventos
        </h1>
        <CreateEventDialog />
      </div>

      {isLoading && <div className="text-muted-foreground">Cargando eventos...</div>}
      {isError && <div className="text-destructive">Error al cargar eventos.</div>}

      {!isLoading && !isError && (
        <EventsTable
          events={orgEvents}
          onDelete={(id) => deleteEvent.mutate(id)}
          onRowClick={(id) => {
            const ev = orgEvents.find((e) => e.id === id);
            if (ev) { setSelectedEvent(ev); setEditOpen(true); }
          }}
        />
      )}
      <EditEventDialog
        event={selectedEvent}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
