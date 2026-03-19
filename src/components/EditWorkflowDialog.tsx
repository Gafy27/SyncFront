import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { OrgEvent, Workflow } from "@/lib/types";

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

interface EditWorkflowDialogProps {
    workflow: Workflow;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditWorkflowDialog({ workflow, open, onOpenChange }: EditWorkflowDialogProps) {
    const { toast } = useToast();
    const { selectedOrg } = useOrganization();
    const queryClient = useQueryClient();
    const [triggerInput, setTriggerInput] = useState("");

    const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            workflowType: workflow.type,
            name: workflow.name,
            triggers: workflow.triggers ?? [],
            windowType: workflow.window?.type ?? "tumbling",
            windowSize: workflow.window?.size ?? "30m",
            trigger: workflow.window?.triggers?.[0] ?? "",
        } as any,
    });

    useEffect(() => {
        if (open) {
            reset({
                workflowType: workflow.type,
                name: workflow.name,
                triggers: workflow.triggers ?? [],
                windowType: workflow.window?.type ?? "tumbling",
                windowSize: workflow.window?.size ?? "30m",
                trigger: workflow.window?.triggers?.[0] ?? "",
            } as any);
        }
    }, [open, workflow, reset]);

    const workflowType = watch("workflowType" as any);
    const triggers = workflowType === "stream" ? (watch("triggers" as any) as string[] ?? []) : [];
    const windowType = workflowType === "batch" ? (watch("windowType" as any) as string ?? "tumbling") : "";
    const batchTrigger = workflowType === "batch" ? (watch("trigger" as any) as string ?? "") : "";

    const { data: orgEvents = [] } = useQuery<OrgEvent[]>({
        queryKey: ["organizations", selectedOrg, "events"],
        queryFn: async () => {
            const res = await eventsApi.list(selectedOrg!);
            if (Array.isArray(res)) return res;
            return [];
        },
        enabled: !!selectedOrg && open,
    });

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

    const updateWorkflow = useMutation({
        mutationFn: async (data: FormData) => {
            if (!selectedOrg) throw new Error("Organization required");
            const payload: any = {
                name: data.name,
            };

            if (data.workflowType === "stream") {
                payload.triggers = data.triggers;
            } else {
                const window: any = { type: data.windowType };
                if (data.windowType !== "stepping" && data.windowSize) {
                    window.size = data.windowSize;
                }
                if (data.windowType === "stepping" && data.trigger) {
                    window.triggers = [data.trigger];
                }
                payload.window = window;
            }

            return apiRequest("PUT", `/api/organizations/${selectedOrg}/workflows/${workflow.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "workflows", workflow.id] });
            toast({ title: "Workflow actualizado" });
            onOpenChange(false);
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Editar Workflow</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit((data) => updateWorkflow.mutate(data))} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Workflow</Label>
                        <Input id="name" {...register("name")} placeholder="ej: power_monitoring" />
                        {(errors as any).name && <p className="text-sm text-destructive">{(errors as any).name.message}</p>}
                    </div>

                    {workflowType === "stream" && (
                        <div className="space-y-2">
                            <Label>Triggers (eventos)</Label>
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
                            </div>
                            {windowType !== "stepping" && (
                                <div className="space-y-2">
                                    <Label>Tamaño de ventana</Label>
                                    <Input {...register("windowSize" as any)} placeholder="ej: 30m, 1h" className="font-mono" />
                                </div>
                            )}
                            {windowType === "stepping" && (
                                <div className="space-y-2">
                                    <Label>Evento disparador</Label>
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
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={updateWorkflow.isPending}>
                            {updateWorkflow.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Actualizar Workflow
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
