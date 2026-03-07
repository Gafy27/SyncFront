import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTable } from "@/hooks/use-tables";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Streaming form ───────────────────────────────────────────

const streamingSchema = z.object({
    name: z.string().min(1, "Table name required"),
    type: z.enum(["sql", "python"]).default("sql"),
    publish: z.boolean().default(true),
    memory: z.boolean().default(false),
});
type StreamingFormData = z.infer<typeof streamingSchema>;

// ─── Batch form ───────────────────────────────────────────────

const batchSchema = z.object({
    name: z.string().min(1, "Table name required"),
    functionType: z.enum(["sql", "python"]).default("sql"),
    upsertConstraintsStr: z.string().optional(),
    timeColumn: z.string().optional(),
});
type BatchFormData = z.infer<typeof batchSchema>;

// ─── Props ────────────────────────────────────────────────────

interface Props {
    workflowId: string;
    workflowType: "stream" | "batch";
}

// ─── Streaming sub-form ───────────────────────────────────────

function StreamingTableForm({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
    const { toast } = useToast();
    const createTable = useCreateTable();

    const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<StreamingFormData>({
        resolver: zodResolver(streamingSchema),
        defaultValues: { type: "sql", publish: true, memory: false },
    });

    const tableType = watch("type");

    const onSubmit = (data: StreamingFormData) => {
        createTable.mutate(
            { name: data.name, workflowId, workflowType: "stream", type: data.type, publish: data.publish, memory: data.memory, definition: "" },
            {
                onSuccess: () => { onClose(); reset(); toast({ title: "Success", description: "Table created successfully" }); },
                onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
            }
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="name">Table Name</Label>
                <Input id="name" {...register("name")} placeholder="e.g. adjusted_power" className="font-mono" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
                <Label>Computation Type</Label>
                <Select value={tableType} onValueChange={(val) => setValue("type", val as "sql" | "python")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3 pt-1 border-t">
                <Controller control={control} name="publish" render={({ field }) => (
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-normal">Publish result</Label>
                            <p className="text-xs text-muted-foreground">Send output downstream</p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                )} />
                <Controller control={control} name="memory" render={({ field }) => (
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-normal">Store in memory</Label>
                            <p className="text-xs text-muted-foreground">Keep result in-memory for fast access</p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                )} />
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createTable.isPending}>
                    {createTable.isPending ? "Creating..." : "Create Table"}
                </Button>
            </div>
        </form>
    );
}

// ─── Batch sub-form ───────────────────────────────────────────

function BatchTableForm({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
    const { toast } = useToast();
    const createTable = useCreateTable();

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<BatchFormData>({
        resolver: zodResolver(batchSchema),
        defaultValues: { functionType: "sql", upsertConstraintsStr: "", timeColumn: "" },
    });

    const functionType = watch("functionType");

    const onSubmit = (data: BatchFormData) => {
        const upsertConstraints = data.upsertConstraintsStr
            ? data.upsertConstraintsStr.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
        createTable.mutate(
            {
                name: data.name,
                workflowId,
                workflowType: "batch",
                functionType: data.functionType,
                upsertConstraints,
                timeColumn: data.timeColumn || undefined,
                definition: "",
            },
            {
                onSuccess: () => { onClose(); reset(); toast({ title: "Success", description: "Table created successfully" }); },
                onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
            }
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="batch-name">Table Name</Label>
                <Input id="batch-name" {...register("name")} placeholder="e.g. availability" className="font-mono" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
                <Label>Function Type</Label>
                <Select value={functionType} onValueChange={(val) => setValue("functionType", val as "sql" | "python")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="upsert">Upsert Constraints</Label>
                <Input
                    id="upsert"
                    {...register("upsertConstraintsStr")}
                    placeholder="e.g. batch_id, machine_id"
                    className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Comma-separated column names for upsert</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="time-col">Time Column</Label>
                <Input
                    id="time-col"
                    {...register("timeColumn")}
                    placeholder="e.g. event_time"
                    className="font-mono"
                />
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createTable.isPending}>
                    {createTable.isPending ? "Creating..." : "Create Table"}
                </Button>
            </div>
        </form>
    );
}

// ─── Main dialog ──────────────────────────────────────────────

export function CreateTableDialog({ workflowId, workflowType }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" disabled={!workflowId}>
                    <Plus className="h-4 w-4" /> Add Table
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>
                        {workflowType === "stream" ? "Add Streaming Table" : "Add Batch Table"}
                    </DialogTitle>
                </DialogHeader>
                {workflowType === "stream" ? (
                    <StreamingTableForm workflowId={workflowId} onClose={() => setOpen(false)} />
                ) : (
                    <BatchTableForm workflowId={workflowId} onClose={() => setOpen(false)} />
                )}
            </DialogContent>
        </Dialog>
    );
}
