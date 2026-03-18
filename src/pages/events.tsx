import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { events as eventsApi } from "@/lib/api";
import { useOrganization } from "@/providers/organization-provider";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EventsTable } from "@/components/events-table";
import type { OrgEvent } from "@/lib/types";

const eventSchema = z.object({
  event: z.string().min(1, "El nombre del evento es obligatorio"),
  topic: z.string().optional(),
  type: z.enum(["FLOAT", "INT", "BOOL", "STRING"]).default("FLOAT"),
  values_range: z.array(z.number()).length(2).optional(),
  auth_values: z.array(z.string()).optional(),
  authenticate: z.boolean().default(false),
  is_counter: z.boolean().default(false),
  remove_duplicates: z.boolean().default(false),
});

type EventFormValues = z.infer<typeof eventSchema>;

function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      event: "",
      topic: "",
      type: "FLOAT",
      authenticate: false,
      is_counter: false,
      remove_duplicates: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: EventFormValues) => eventsApi.create(selectedOrg!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", selectedOrg, "events"],
      });
      toast({ title: "Evento creado" });
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-event">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Evento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name="event"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Evento</FormLabel>
                  <FormControl>
                    <Input placeholder="ej: temperatura" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ej: sensor/temp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Dato</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FLOAT">Float</SelectItem>
                      <SelectItem value="INT">Integer</SelectItem>
                      <SelectItem value="BOOL">Boolean</SelectItem>
                      <SelectItem value="STRING">String</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="authenticate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Autenticar</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_counter"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Es Contador</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remove_duplicates"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Eliminar Duplicados</FormLabel>
                    <FormDescription>
                      Ignorar eventos con el mismo valor consecutivos.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creando..." : "Crear Evento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function EventsPage() {
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<OrgEvent[]>({
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
      queryClient.invalidateQueries({
        queryKey: ["organizations", selectedOrg, "events"],
      });
      toast({ title: "Evento eliminado" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!selectedOrg) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">
          Selecciona una organización para ver los eventos.
        </p>
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

      <EventsTable
        events={events}
        onDelete={(id) => deleteEvent.mutate(id)}
      />
    </div>
  );
}
