import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useOrganization } from "@/providers/organization-provider";
import { CreateWorkflowDialog } from "@/components/CreateWorkflowDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Workflow } from "@/lib/types";

function normalizeWorkflows(res: unknown): Workflow[] {
  if (Array.isArray(res)) return res as Workflow[];
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as Workflow[];
    if (Array.isArray(o.workflows)) return o.workflows as Workflow[];
    if (Array.isArray(o.data)) return o.data as Workflow[];
    const arrKey = Object.keys(o).find((k) => Array.isArray(o[k]));
    if (arrKey) return o[arrKey] as Workflow[];
  }
  return [];
}

export default function WorkflowsPage() {
  const [, setLocation] = useLocation();
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: workflows, isLoading, isError } = useQuery({
    queryKey: ["organizations", selectedOrg, "workflows"],
    queryFn: async () => {
      if (!selectedOrg) return [];
      const res = await apiRequest<unknown>("GET", `/api/organizations/${selectedOrg}/workflows`);
      return normalizeWorkflows(res);
    },
    enabled: !!selectedOrg,
  });
  const workflowList = Array.isArray(workflows) ? workflows : [];

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!selectedOrg) throw new Error("Organization required");
      return apiRequest("DELETE", `/api/organizations/${selectedOrg}/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "workflows"] });
    },
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("¿Eliminar este workflow?")) return;
    try {
      await deleteWorkflowMutation.mutateAsync(id);
      toast({ title: "Eliminado", description: "Workflow eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el workflow", variant: "destructive" });
    }
  };

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

      {isLoading && <div className="text-muted-foreground">Cargando workflows...</div>}
      {isError && <div className="text-destructive">Error al cargar workflows.</div>}

      {!isLoading && !isError && (
        <Card data-testid="card-workflows-table">
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium uppercase">Nombre</TableHead>
                    <TableHead className="text-xs font-medium uppercase">Tipo</TableHead>
                    <TableHead className="text-xs font-medium uppercase">Configuración</TableHead>
                    <TableHead className="text-xs font-medium uppercase">Tablas</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflowList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay workflows registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    workflowList.map((workflow) => {
                      const isStreaming = workflow.type === "stream";
                      const tableCount = workflow.tables_count ?? workflow.tables?.length ?? 0;

                      let config: string;
                      if (isStreaming) {
                        const n = workflow.triggers?.length ?? 0;
                        config = `${n} trigger${n !== 1 ? "s" : ""}`;
                      } else {
                        const wt = workflow.window?.type ?? "—";
                        const ws = workflow.window?.size;
                        config = ws ? `${wt} · ${ws}` : wt;
                      }

                      return (
                        <TableRow
                          key={workflow.id}
                          className="hover-elevate cursor-pointer"
                          onClick={() => setLocation(`/workflow/${workflow.id}`)}
                          data-testid={`row-workflow-${workflow.id}`}
                        >
                          <TableCell className="text-sm font-medium" data-testid={`text-workflow-name-${workflow.id}`}>
                            {workflow.name}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge
                              variant="outline"
                              className={isStreaming
                                ? "text-blue-600 border-blue-300 bg-blue-50"
                                : "text-purple-600 border-purple-300 bg-purple-50"}
                            >
                              {isStreaming ? "Streaming" : "Batch"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {config}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {tableCount}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => handleDelete(e, workflow.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
