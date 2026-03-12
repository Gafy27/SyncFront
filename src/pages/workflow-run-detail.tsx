import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useOrganization } from "@/providers/organization-provider";
import { workflowRuns as runsApi, workflows as workflowsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Copy, ChevronDown, ChevronRight } from "lucide-react";
import type { ActivityLog } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────

function groupActivities(items: ActivityLog[]): ActivityLog[] {
  const map = new Map<string, ActivityLog>();
  for (const item of items) {
    const existing = map.get(item.activity_name);
    if (!existing || item.status === "completed" || item.status === "failed") {
      map.set(item.activity_name, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.started_at - b.started_at);
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

// ─── Gantt chart ─────────────────────────────────────────────


function GanttChart({ activities }: { activities: ActivityLog[] }) {
  const withTimes = activities.filter((a) => a.started_at > 0);
  if (withTimes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No hay datos de timing disponibles.
      </p>
    );
  }

  const minTs = Math.min(...withTimes.map((a) => a.started_at));
  const maxTs = Math.max(
    ...withTimes.map((a) => (a.completed_at > 0 ? a.completed_at : a.started_at + 1))
  );
  const totalDuration = maxTs - minTs || 1;

  const formatAxisTs = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });

  return (
    <div className="space-y-2">
      {/* Timeline axis */}
      <div className="flex justify-between text-xs text-muted-foreground font-mono px-[120px]">
        <span>{formatAxisTs(minTs)}</span>
        <span>{formatAxisTs(maxTs)}</span>
      </div>

      {/* Activity rows */}
      <div className="space-y-1.5">
        {withTimes.map((activity) => {
          const start = activity.started_at;
          const end = activity.completed_at > 0 ? activity.completed_at : maxTs;
          const left = ((start - minTs) / totalDuration) * 100;
          const width = Math.max(((end - start) / totalDuration) * 100, 0.5);
          const color =
            activity.status === "completed"
              ? "bg-green-500"
              : activity.status === "failed"
              ? "bg-red-500"
              : "bg-blue-500 animate-pulse";
          const dur = activity.duration_ms > 0 ? formatDuration(activity.duration_ms) : "…";

          return (
            <div key={activity.activity_name} className="flex items-center gap-2">
              <div className="w-[120px] shrink-0 text-right">
                <span className="text-xs font-mono text-muted-foreground truncate block">
                  {activity.activity_name}
                </span>
              </div>
              <div className="flex-1 relative h-7 bg-muted/40 rounded overflow-hidden">
                <div
                  className={`absolute h-full rounded ${color} flex items-center justify-end pr-1.5`}
                  style={{ left: `${left}%`, width: `${width}%`, minWidth: "4px" }}
                >
                  <span className="text-white text-[10px] font-mono truncate">{dur}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground font-mono px-[120px] pt-1 border-t border-border/40">
        <span>Total: {formatDuration(totalDuration)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />completed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />running</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />failed</span>
        </span>
      </div>
    </div>
  );
}

// ─── JSON viewer ─────────────────────────────────────────────

function JsonViewer({ data }: { data: unknown }) {
  const text = JSON.stringify(data, null, 2);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      {copied && (
        <span className="absolute top-2 right-8 text-xs text-green-600 font-medium">
          Copiado
        </span>
      )}
      <pre className="text-xs font-mono bg-muted text-foreground rounded-md p-4 overflow-auto max-h-64 leading-5">
        {text}
      </pre>
    </div>
  );
}

// ─── Activity row ─────────────────────────────────────────────

function ActivityRow({ activity }: { activity: ActivityLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasLog = Object.keys(activity.activity_log).length > 0;

  return (
    <>
      <tr
        className={`border-b border-border/50 ${hasLog ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={() => hasLog && setExpanded((v) => !v)}
      >
        <td className="py-2.5 pl-4">
          {hasLog ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="w-3.5 h-3.5 block" />
          )}
        </td>
        <td className="py-2.5 font-mono text-sm">{activity.activity_name}</td>
        <td className="py-2.5">
          <StatusBadge status={activity.status} />
        </td>
        <td className="py-2.5 font-mono text-sm text-muted-foreground">
          {formatDuration(activity.duration_ms)}
        </td>
        <td className="py-2.5 text-sm text-muted-foreground">
          {formatTs(activity.started_at)}
        </td>
        <td className="py-2.5 pr-4 text-sm">
          {activity.activity_log.status ? (
            <Badge
              variant="outline"
              className={
                activity.activity_log.status === "ACCEPTED"
                  ? "text-green-600 border-green-400/50 bg-green-50 dark:bg-green-950/30 text-xs"
                  : activity.activity_log.status === "REJECTED"
                  ? "text-orange-600 border-orange-400/50 bg-orange-50 text-xs"
                  : "text-red-600 border-red-400/50 bg-red-50 text-xs"
              }
            >
              {activity.activity_log.status as string}
            </Badge>
          ) : null}
        </td>
      </tr>
      {expanded && hasLog && (
        <tr className="border-b border-border/50 bg-muted/10">
          <td colSpan={6} className="p-4">
            <JsonViewer data={activity.activity_log} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ───────────────────────────────────────────────

export default function WorkflowRunDetailPage() {
  const [, params] = useRoute("/workflow/:id/runs/:runId");
  const [, setLocation] = useLocation();
  const { selectedOrg } = useOrganization();
  const workflowId = params?.id ?? null;
  const runId = params?.runId ?? null;

  const { data: workflow } = useQuery({
    queryKey: ["organizations", selectedOrg, "workflows", workflowId],
    queryFn: () => workflowsApi.get(selectedOrg!, workflowId!),
    enabled: !!selectedOrg && !!workflowId,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["organizations", selectedOrg, "workflows", workflowId, "runs", runId],
    queryFn: () => runsApi.activities(selectedOrg!, workflowId!, runId!),
    enabled: !!selectedOrg && !!workflowId && !!runId,
    refetchInterval: 5_000,
  });

  const allActivities = data?.items ?? [];
  const activities = groupActivities(allActivities);

  // For the run summary, derive from activities list (all share same run metadata)
  const runStatus = allActivities.find((a) => a.status === "failed")
    ? "failed"
    : allActivities.every((a) => a.status === "completed")
    ? "completed"
    : "running";

  const minStarted = activities.reduce(
    (min, a) => (a.started_at > 0 && a.started_at < min ? a.started_at : min),
    Infinity
  );
  const maxCompleted = activities.reduce(
    (max, a) => (a.completed_at > max ? a.completed_at : max),
    0
  );
  const totalDuration = maxCompleted > 0 && minStarted < Infinity
    ? maxCompleted - minStarted
    : 0;

  // Last completed activity log as run output
  const lastCompleted = [...activities]
    .reverse()
    .find((a) => a.status === "completed" && Object.keys(a.activity_log).length > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        SYNC /{" "}
        <span className="hover:underline cursor-pointer" onClick={() => setLocation("/workflows")}>
          Workflows
        </span>{" "}
        /{" "}
        <span
          className="hover:underline cursor-pointer"
          onClick={() => setLocation(`/workflow/${workflowId}`)}
        >
          {workflow?.name ?? workflowId}
        </span>{" "}
        /{" "}
        <span
          className="hover:underline cursor-pointer"
          onClick={() => setLocation(`/workflow/${workflowId}/runs`)}
        >
          Runs
        </span>{" "}
        /{" "}
        <span className="text-foreground font-mono">{runId?.slice(0, 12)}…</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setLocation(`/workflow/${workflowId}/runs`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold font-mono">{runId?.slice(0, 24)}…</h1>
        <StatusBadge status={runStatus} />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando logs…
        </div>
      )}
      {isError && (
        <div className="text-destructive">Error al cargar los logs del run.</div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Top row: Info + Result */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Info card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Información del Run</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Run ID</span>
                  <span className="font-mono text-xs break-all">{runId}</span>

                  <span className="text-muted-foreground">Workflow</span>
                  <span>{workflow?.name ?? workflowId}</span>

                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={runStatus} />

                  <span className="text-muted-foreground">Iniciado</span>
                  <span className="font-mono text-xs">
                    {minStarted < Infinity ? formatTs(minStarted) : "—"}
                  </span>

                  <span className="text-muted-foreground">Completado</span>
                  <span className="font-mono text-xs">
                    {maxCompleted > 0 ? formatTs(maxCompleted) : "—"}
                  </span>

                  <span className="text-muted-foreground">Duración total</span>
                  <span className="font-mono text-sm font-medium">
                    {formatDuration(totalDuration)}
                  </span>

                  <span className="text-muted-foreground">Actividades</span>
                  <span>{activities.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Result JSON card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Resultado
                  {lastCompleted && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground font-mono">
                      ({lastCompleted.activity_name})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastCompleted ? (
                  <JsonViewer data={lastCompleted.activity_log} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin resultado disponible aún.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gantt / Event History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Event History</CardTitle>
            </CardHeader>
            <CardContent>
              <GanttChart activities={activities} />
            </CardContent>
          </Card>

          {/* Activities table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Actividades
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({activities.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-medium uppercase text-muted-foreground">
                      <th className="py-2.5 pl-4 w-8" />
                      <th className="py-2.5 text-left">Actividad</th>
                      <th className="py-2.5 text-left">Status</th>
                      <th className="py-2.5 text-left">Duración</th>
                      <th className="py-2.5 text-left">Iniciado</th>
                      <th className="py-2.5 pr-4 text-left">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          No hay actividades
                        </td>
                      </tr>
                    ) : (
                      activities.map((activity) => (
                        <ActivityRow key={activity.activity_name} activity={activity} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
