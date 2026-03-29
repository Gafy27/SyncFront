import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { workflows as workflowsApi } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Workflow } from "@/lib/types";
import { useLocation } from "wouter";
import { CreateWorkflowDialog } from "@/components/CreateWorkflowDialog";

export default function WorkflowsPage() {
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: workflowsRaw, isLoading } = useQuery({
    queryKey: ["organizations", selectedOrg, "workflows"],
    queryFn: () => workflowsApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  const workflows = useMemo(() => {
    if (!workflowsRaw) return [];
    if (Array.isArray(workflowsRaw)) return workflowsRaw;
    if (typeof workflowsRaw === "object") {
      const obj = workflowsRaw as any;
      if (Array.isArray(obj.items)) return obj.items;
      if (Array.isArray(obj.workflows)) return obj.workflows;
      // Fallback: find any key that contains an array
      const key = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (key) return obj[key];
    }
    return [];
  }, [workflowsRaw]);

  const deleteWorkflow = useMutation({
    mutationFn: (workflowId: string) => workflowsApi.delete(selectedOrg!, workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "workflows"] });
      toast({ title: "Workflow eliminado" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!selectedOrg) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">Selecciona una organización para ver los workflows.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <WorkflowIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Workflows</span>
        </div>
        <CreateWorkflowDialog />
      </div>

      {/* Table */}
      <div className="px-6 pt-4" data-testid="card-workflow-table">
        <Table className="border-none">
          <TableHeader className="[&_tr]:border-none">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Workflow</TableHead>
              <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide w-[100px]">Tipo</TableHead>
              <TableHead className="h-8 text-right text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Actualizado</TableHead>
              <TableHead className="w-10 h-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent border-none">
                <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                  Cargando workflows...
                </TableCell>
              </TableRow>
            ) : workflows.length === 0 ? (
              <TableRow className="hover:bg-transparent border-none">
                <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                  No hay workflows registrados
                </TableCell>
              </TableRow>
            ) : (
              workflows.map((wf: Workflow) => (
                <TableRow
                  key={wf.id}
                  className="group border-none hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/workflow/${wf.id}`)}
                >
                  <TableCell className="py-3 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                        {wf.name}
                      </span>
                      <span className="text-[12px] text-muted-foreground line-clamp-1">
                        {wf.description || "Sin descripción"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <Badge variant="outline" className="capitalize text-[12px]">
                      {wf.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-right text-[13px] text-muted-foreground align-top">
                    {wf.updated_at
                      ? new Date(wf.updated_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                      : "—"}
                  </TableCell>
                  <TableCell className="py-3 text-right align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`¿Eliminar workflow "${wf.name}"?`)) return;
                        deleteWorkflow.mutate(wf.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
