import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useOrganization } from "@/providers/organization-provider";
import { workflowRuns as runsApi, workflows as workflowsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, RefreshCw, History } from "lucide-react";
import type { WorkflowRun } from "@/lib/types";

function groupRuns(items: WorkflowRun[]): WorkflowRun[] {
  const map = new Map<string, WorkflowRun>();
  for (const item of items) {
    const existing = map.get(item.run_id);
    if (!existing || item.status === "completed" || item.status === "failed") {
      map.set(item.run_id, item);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "completed"
      ? "text-green-600 border-green-500/30 bg-green-500/10"
      : status === "running"
        ? "text-blue-500 border-blue-500/30 bg-blue-500/10"
        : "text-red-500 border-red-500/30 bg-red-500/10";
  return (
    <Badge variant="outline" className={`capitalize text-[11px] font-medium px-2 py-0 h-5 ${cls}`}>
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
  return new Date(epochMs).toLocaleString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
    <div className="flex flex-col h-full bg-background no-scrollbar">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation(`/workflow/${workflowId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ejecuciones {workflow ? `· ${workflow.name}` : ""}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium bg-muted/20"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isFetching && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto px-6 pt-4 no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando ejecuciones...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive">Error al cargar los runs.</div>
        ) : (
          <Table className="border-none">
            <TableHeader className="[&_tr]:border-none">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide pl-0">Status</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Run ID</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Iniciado</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Completado</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide text-right">Duración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground text-sm">
                    No hay ejecuciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                runs.map((run) => (
                  <TableRow
                    key={run.run_id}
                    className="group border-none hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/workflow/${workflowId}/runs/${run.run_id}`)}
                  >
                    <TableCell className="py-3 pl-0">
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[12px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                        {run.run_id.slice(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[13px] text-foreground/80">
                        {formatTs(run.started_at)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[13px] text-muted-foreground">
                        {run.status !== "running" ? formatTs(run.completed_at) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="text-[12px] font-mono text-muted-foreground">
                        {formatDuration(run.duration_ms)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// Utility for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
