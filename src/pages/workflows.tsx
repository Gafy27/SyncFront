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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Workflow } from "@/lib/types";
import { useLocation } from "wouter";
import { CreateWorkflowDialog } from "@/components/CreateWorkflowDialog";

export default function WorkflowsPage() {
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: workflows = [], isLoading, isError } = useQuery<Workflow[]>({
    queryKey: ["organizations", selectedOrg, "workflows"],
    queryFn: async () => {
      const res = await workflowsApi.list(selectedOrg!);
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object") {
        const o = res as Record<string, unknown>;
        const key = Object.keys(o).find((k) => Array.isArray(o[k]));
        if (key) return o[key] as Workflow[];
      }
      return [];
    },
    enabled: !!selectedOrg,
  });

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
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Workflows</span>
      </div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Workflows
        </h1>
        <CreateWorkflowDialog />
      </div>

      <Card data-testid="card-workflow-table">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium uppercase">Nombre</TableHead>
                  <TableHead className="text-xs font-medium uppercase">Tipo</TableHead>
                  <TableHead className="text-xs font-medium uppercase">Descripción</TableHead>
                  <TableHead className="text-xs font-medium uppercase">Actualizado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Cargando workflows...
                    </TableCell>
                  </TableRow>
                ) : workflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No hay workflows registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  workflows.map((wf) => (
                    <TableRow
                      key={wf.id}
                      className="cursor-pointer"
                      onClick={() => setLocation(`/workflow/${wf.id}`)}
                    >
                      <TableCell className="font-medium">{wf.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {wf.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{wf.description}</TableCell>
                      <TableCell>{wf.updated_at ? new Date(wf.updated_at).toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm(`¿Eliminar workflow "${wf.name}"?`)) return;
                            deleteWorkflow.mutate(wf.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
