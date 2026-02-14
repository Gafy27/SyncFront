import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTableSchema } from "@shared/schema";
import { useCreateTable } from "@/hooks/use-tables";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertTableSchema.pick({
  name: true,
  functionType: true,
  timeColumn: true,
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  workflowId: number;
}

export function CreateTableDialog({ workflowId }: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createTable = useCreateTable();
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      functionType: "sql",
      timeColumn: "",
    }
  });

  // Watch for validation or conditional logic if needed
  const functionType = watch("functionType");

  const onSubmit = (data: FormData) => {
    createTable.mutate(
      {
        ...data,
        workflowId,
        definition: "-- Write your SQL here\nSELECT * FROM source_table", // Default placeholder
        upsertConstraints: [], // Default empty array
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
          toast({ title: "Success", description: "Table created successfully" });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Table
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Table Rule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Table Name</Label>
            <Input id="name" {...register("name")} placeholder="target_table_name" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="functionType">Function Type</Label>
            <Select 
              value={functionType || "sql"} 
              onValueChange={(val) => setValue("functionType", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql">SQL Transformation</SelectItem>
                <SelectItem value="python">Python Script (Future)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeColumn">Time Column (Optional)</Label>
            <Input id="timeColumn" {...register("timeColumn")} placeholder="event_timestamp" />
            <p className="text-xs text-muted-foreground">Used for time-windowing operations</p>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createTable.isPending}>
              {createTable.isPending ? "Creating..." : "Create Table"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
