import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { bridges as bridgesApi, connectorTemplates as templatesApi } from "@/lib/api";
import type { Bridge, ConnectorTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Trash2, Star, GitFork, MoreHorizontal } from "lucide-react";
import { getConnectorIconUrl } from "@/utils/connectorIcons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BridgesPage() {
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: bridgesRaw, isLoading, isError } = useQuery({
    queryKey: ["organizations", selectedOrg, "bridges"],
    queryFn: () => bridgesApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  const bridgeList = useMemo(() => {
    if (!bridgesRaw) return [];
    if (Array.isArray(bridgesRaw)) return bridgesRaw;
    if (typeof bridgesRaw === "object") {
      const obj = bridgesRaw as any;
      if (Array.isArray(obj.items)) return obj.items;
      if (Array.isArray(obj.bridges)) return obj.bridges;
      // Fallback
      const key = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (key) return obj[key];
    }
    return [];
  }, [bridgesRaw]);

  const { data: templates = [] } = useQuery<ConnectorTemplate[]>({
    queryKey: ["connector-templates"],
    queryFn: async () => {
      const res = await templatesApi.list();
      if (Array.isArray(res)) return res;
      if (
        res &&
        typeof res === "object" &&
        "items" in res &&
        Array.isArray((res as { items: ConnectorTemplate[] }).items)
      ) {
        return (res as { items: ConnectorTemplate[] }).items;
      }
      return [];
    },
  });

  const templateById = Object.fromEntries(templates.map((t) => [t.id, t]));
  const templateBySlug = Object.fromEntries(templates.map((t) => [t.slug, t]));

  const deleteBridge = useMutation({
    mutationFn: (bridgeId: string) => bridgesApi.delete(selectedOrg!, bridgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "bridges"] });
      toast({ title: "Bridge eliminado" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!selectedOrg) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">Selecciona una organización para ver los bridges.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <GitFork className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Bridges</span>
        </div>
        <Button
          size="sm"
          onClick={() => setLocation("/bridges/new")}
          data-testid="button-add-bridge"
          className="h-8 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Nuevo Bridge
        </Button>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading && <div className="text-muted-foreground text-sm">Cargando bridges...</div>}
        {isError && <div className="text-destructive text-sm">Error al cargar bridges.</div>}

        {!isLoading && !isError && bridgeList.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No hay bridges. Crea uno nuevo seleccionando un conector.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {bridgeList.map((bridge) => {
            const template =
              (bridge.template_id ? templateById[bridge.template_id] : undefined) ??
              (bridge.type ? templateBySlug[bridge.type] : undefined);

            const iconSrc = template
              ? template.icon?.startsWith("http")
                ? template.icon
                : getConnectorIconUrl(template.name, template.slug)
              : getConnectorIconUrl(bridge.type, bridge.type);

            const envKeys = bridge.variants ? Object.keys(bridge.variants) : [];

            return (
              <div
                key={bridge.id}
                data-testid={`card-bridge-${bridge.id}`}
                onClick={() => setLocation(`/bridges/${bridge.id}`)}
                className="group relative flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border/50 hover:border-border hover:bg-muted/60 transition-all cursor-pointer"
              >
                {/* Icon */}
                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-background rounded-md border border-border/50">
                  <img
                    src={iconSrc}
                    alt={template?.name ?? bridge.type ?? bridge.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div className="w-6 h-6 hidden items-center justify-center text-xs font-semibold text-muted-foreground">
                    {(bridge.type ?? bridge.name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold text-foreground truncate">
                          {bridge.name}
                        </span>
                        {bridge.is_default && (
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                        )}
                      </div>
                      {bridge.type && (
                        <span className="text-[12px] text-muted-foreground truncate">{bridge.type}</span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm(`¿Eliminar bridge "${bridge.name}"?`)) return;
                            deleteBridge.mutate(bridge.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges */}
                  {envKeys.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {envKeys.map((env) => (
                        <Badge key={env} variant="outline" className="text-[11px] capitalize px-1.5 py-0 h-5">
                          {env}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
