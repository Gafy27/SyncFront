import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWorkflowSchema } from "@shared/schema";
import { useCreateWorkflow } from "@/hooks/use-workflows";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertWorkflowSchema.pick({ name: true });
type FormData = z.infer<typeof formSchema>;

export function CreateWorkflowDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createWorkflow = useCreateWorkflow();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormData) => {
    createWorkflow.mutate(
      // Default windowConfig is set by DB default, or we can pass explicit default here
      { ...data, windowConfig: { type: "tumbling" } },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
          toast({ title: "Success", description: "Workflow created successfully" });
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
        <Button className="w-full gap-2 bg-primary/20 text-primary hover:bg-primary/30 border-0">
          <Plus className="h-4 w-4" /> New Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workflow Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g., daily_processing" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createWorkflow.isPending}>
              {createWorkflow.isPending ? "Creating..." : "Create Workflow"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
