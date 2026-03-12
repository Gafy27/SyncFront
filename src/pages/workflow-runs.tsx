import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useOrganization } from "@/providers/organization-provider";
import { workflowRuns as runsApi, workflows as workflowsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import type { WorkflowRun } from "@/lib/types";

function groupRuns(items: WorkflowRun[]): WorkflowRun[] {
  const map = new Map<string, WorkflowRun>();
  for (const item of items) {
    const existing = map.get(item.run_id);
    if (!existing || item.status === "completed" || item.status === "failed") {
      map.set(item.run_id, item);
    }
  }
  // sort newest first by ts
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "completed"
      ? "text-green-600 border-green-400/50 bg-green-50 dark:bg-green-950/30"
      : status === "running"
      ? "text-blue-600 border-blue-400/50 bg-blue-50 dark:bg-blue-950/30"
      : "text-red-600 border-red-400/50 bg-red-50 dark:bg-red-950/30";
  return (
    <Badge variant="outline" className={`capitalize text-xs ${cls}`}>
      {status}
    </Badge>
  );
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTs(epochMs: number): string {
  if (!epochMs) return "—";
  return new Date(epochMs).toLocaleString();
}

export default function WorkflowRunsPage() {
  const [, params] = useRoute("/workflow/:id/runs");
  const [, setLocation] = useLocation();
  const { selectedOrg } = useOrganization();
  const workflowId = params?.id ?? null;

  const { data: workflow } = useQuery({
    queryKey: ["organizations", selectedOrg, "workflows", workflowId],
    queryFn: () => workflowsApi.get(selectedOrg!, workflowId!),
    enabled: !!selectedOrg && !!workflowId,
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["organizations", selectedOrg, "workflows", workflowId, "runs"],
    queryFn: () => runsApi.list(selectedOrg!, workflowId!),
    enabled: !!selectedOrg && !!workflowId,
    refetchInterval: 10_000,
  });

  const runs = groupRuns(data?.items ?? []);

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC /{" "}
        <span
          className="hover:underline cursor-pointer"
          onClick={() => setLocation("/workflows")}
        >
          Workflows
        </span>{" "}
        /{" "}
        <span
          className="hover:underline cursor-pointer"
          onClick={() => setLocation(`/workflow/${workflowId}`)}
        >
          {workflow?.name ?? workflowId}
        </span>{" "}
        / <span className="text-foreground">Runs</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocation(`/workflow/${workflowId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Runs</h1>
            {data && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.total} ejecución{data.total !== 1 ? "es" : ""}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando runs...
        </div>
      )}
      {isError && (
        <div className="text-destructive">Error al cargar los runs.</div>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium uppercase pl-4">Status</TableHead>
                  <TableHead className="text-xs font-medium uppercase font-mono">Run ID</TableHead>
                  <TableHead className="text-xs font-medium uppercase">Iniciado</TableHead>
                  <TableHead className="text-xs font-medium uppercase">Completado</TableHead>
                  <TableHead className="text-xs font-medium uppercase">Duración</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-10"
                    >
                      No hay runs registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow
                      key={run.run_id}
                      className="hover-elevate cursor-pointer"
                      onClick={() =>
                        setLocation(
                          `/workflow/${workflowId}/runs/${run.run_id}`
                        )
                      }
                    >
                      <TableCell className="pl-4">
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {run.run_id.slice(0, 16)}…
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTs(run.started_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {run.status !== "running"
                          ? formatTs(run.completed_at)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {formatDuration(run.duration_ms)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
