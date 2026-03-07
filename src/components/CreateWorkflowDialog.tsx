import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { events as eventsApi } from "@/lib/api";
import { useOrganization } from "@/providers/organization-provider";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrgEvent } from "@/lib/types";

const BATCH_WINDOW_TYPES = ["tumbling", "sliding", "stepping"] as const;

const formSchema = z.discriminatedUnion("workflowType", [
  z.object({
    workflowType: z.literal("stream"),
    name: z.string().min(1, "Name required"),
    triggers: z.array(z.string()).min(1, "At least one trigger required"),
  }),
  z.object({
    workflowType: z.literal("batch"),
    name: z.string().min(1, "Name required"),
    windowType: z.enum(BATCH_WINDOW_TYPES),
    windowSize: z.string().optional(),
    trigger: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.windowType !== "stepping" && !data.windowSize) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Window size required", path: ["windowSize"] });
    }
    if (data.windowType === "stepping" && !data.trigger) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Trigger event required for stepping window", path: ["trigger"] });
    }
  }),
]);
type FormData = z.infer<typeof formSchema>;

export function CreateWorkflowDialog() {
  const [open, setOpen] = useState(false);
  const [workflowType, setWorkflowType] = useState<"stream" | "batch">("stream");
  const [triggerInput, setTriggerInput] = useState("");
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();

  // Load org events for trigger selection (stream and batch stepping)
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
    enabled: !!selectedOrg && open,
  });

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { workflowType: "stream", name: "", triggers: [] } as FormData,
  });

  const triggers = workflowType === "stream" ? (watch("triggers" as any) as string[] ?? []) : [];
  const windowType = workflowType === "batch" ? (watch("windowType" as any) as string ?? "tumbling") : "";
  const batchTrigger = workflowType === "batch" ? (watch("trigger" as any) as string ?? "") : "";

  const addTrigger = (value?: string) => {
    const v = (value ?? triggerInput).trim();
    if (v && !triggers.includes(v)) {
      setValue("triggers" as any, [...triggers, v], { shouldValidate: true });
    }
    setTriggerInput("");
  };

  const removeTrigger = (t: string) => {
    setValue("triggers" as any, triggers.filter((v) => v !== t), { shouldValidate: true });
  };

  const switchType = (type: "stream" | "batch") => {
    setWorkflowType(type);
    if (type === "stream") {
      reset({ workflowType: "stream", name: watch("name" as any) ?? "", triggers: [] } as FormData);
    } else {
      reset({ workflowType: "batch", name: watch("name" as any) ?? "", windowType: "tumbling", windowSize: "30m" } as FormData);
    }
  };

  const createWorkflow = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedOrg) throw new Error("Organization required");
      if (data.workflowType === "stream") {
        return apiRequest("POST", `/api/organizations/${selectedOrg}/workflows`, {
          name: data.name,
          type: "stream",
          triggers: data.triggers,
        });
      } else {
        const window: Record<string, unknown> = { type: data.windowType };
        if (data.windowType !== "stepping" && data.windowSize) {
          window.size = data.windowSize;
        }
        if (data.windowType === "stepping" && data.trigger) {
          window.triggers = [data.trigger];
        }
        return apiRequest("POST", `/api/organizations/${selectedOrg}/workflows`, {
          name: data.name,
          type: "batch",
          window,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "workflows"] });
    },
  });

  const onSubmit = (data: FormData) => {
    createWorkflow.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        reset();
        setTriggerInput("");
        toast({ title: "Workflow creado" });
      },
      onError: (err: Error) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-workflow">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Crear Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Workflow Type Toggle */}
          <div className="space-y-2">
            <Label>Tipo de Workflow</Label>
            <Tabs value={workflowType} onValueChange={(v) => switchType(v as "stream" | "batch")}>
              <TabsList className="w-full">
                <TabsTrigger value="stream" className="flex-1">Stream</TabsTrigger>
                <TabsTrigger value="batch" className="flex-1">Batch</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {workflowType === "stream"
                ? "Procesamiento en tiempo real por cada evento recibido"
                : "Procesamiento por ventanas de tiempo (tumbling, sliding, stepping)"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Workflow</Label>
            <Input id="name" {...register("name")} placeholder="ej: power_monitoring" />
            {(errors as any).name && <p className="text-sm text-destructive">{(errors as any).name.message}</p>}
          </div>

          {/* Stream: triggers */}
          {workflowType === "stream" && (
            <div className="space-y-2">
              <Label>Triggers (eventos)</Label>
              <p className="text-xs text-muted-foreground">
                Selecciona los eventos que disparan el procesamiento
              </p>
              {orgEvents.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {orgEvents.map((ev) => {
                    const selected = triggers.includes(ev.event);
                    return (
                      <Badge
                        key={ev.event}
                        variant={selected ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => selected ? removeTrigger(ev.event) : addTrigger(ev.event)}
                      >
                        {ev.event}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={triggerInput}
                    onChange={(e) => setTriggerInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTrigger(); } }}
                    placeholder="ej: power, temperature"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addTrigger()} disabled={!triggerInput.trim()}>
                    Add
                  </Button>
                </div>
              )}
              {triggers.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {triggers.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 pr-1">
                      {t}
                      <button type="button" onClick={() => removeTrigger(t)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {(errors as any).triggers && <p className="text-sm text-destructive">{(errors as any).triggers.message}</p>}
            </div>
          )}

          {/* Batch: window config */}
          {workflowType === "batch" && (
            <>
              <div className="space-y-2">
                <Label>Tipo de ventana</Label>
                <Controller
                  control={control}
                  name={"windowType" as any}
                  render={({ field }) => (
                    <Select value={field.value ?? "tumbling"} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de ventana" />
                      </SelectTrigger>
                      <SelectContent>
                        {BATCH_WINDOW_TYPES.map((wt) => (
                          <SelectItem key={wt} value={wt}>
                            {wt.charAt(0).toUpperCase() + wt.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {(errors as any).windowType && <p className="text-sm text-destructive">{(errors as any).windowType.message}</p>}
              </div>
              {windowType !== "stepping" && (
                <div className="space-y-2">
                  <Label>Tamaño de ventana</Label>
                  <Input
                    {...register("windowSize" as any)}
                    placeholder="ej: 30m, 1h, 15m"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Formato: 30m, 1h, 24h, 7d</p>
                  {(errors as any).windowSize && <p className="text-sm text-destructive">{(errors as any).windowSize.message}</p>}
                </div>
              )}
              {windowType === "stepping" && (
                <div className="space-y-2">
                  <Label>Evento disparador</Label>
                  <p className="text-xs text-muted-foreground">
                    El evento que dispara la ejecución de esta ventana
                  </p>
                  {orgEvents.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {orgEvents.map((ev) => (
                        <Badge
                          key={ev.event}
                          variant={batchTrigger === ev.event ? "default" : "outline"}
                          className="cursor-pointer select-none"
                          onClick={() => setValue("trigger" as any, batchTrigger === ev.event ? "" : ev.event, { shouldValidate: true })}
                        >
                          {ev.event}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Input
                      {...register("trigger" as any)}
                      placeholder="ej: power, temperature"
                    />
                  )}
                  {(errors as any).trigger && <p className="text-sm text-destructive">{(errors as any).trigger.message}</p>}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={createWorkflow.isPending}>
              {createWorkflow.isPending ? "Creando..." : "Crear Workflow"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
