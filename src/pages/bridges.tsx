import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { bridges as bridgesApi, connectorTemplates as templatesApi } from "@/lib/api";
import type { Bridge, ConnectorTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Trash2, Star } from "lucide-react";
import { getConnectorIconUrl } from "@/utils/connectorIcons";

export default function BridgesPage() {
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: bridgeList = [], isLoading, isError } = useQuery<Bridge[]>({
    queryKey: ["organizations", selectedOrg, "bridges"],
    queryFn: async () => {
      const res = await bridgesApi.list(selectedOrg!);
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object") {
        const o = res as Record<string, unknown>;
        const key = Object.keys(o).find((k) => Array.isArray(o[k]));
        if (key) return o[key] as Bridge[];
      }
      return [];
    },
    enabled: !!selectedOrg,
  });

  const { data: templates = [] } = useQuery<ConnectorTemplate[]>({
    queryKey: ["connector-templates"],
    queryFn: async () => {
      const res = await templatesApi.list();
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object" && "items" in res && Array.isArray((res as { items: ConnectorTemplate[] }).items)) {
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
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Bridges</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Bridges
        </h1>
        <Button onClick={() => setLocation("/bridges/new")} data-testid="button-add-bridge">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Bridge
        </Button>
      </div>

      {isLoading && <div className="text-muted-foreground">Cargando bridges...</div>}
      {isError && <div className="text-destructive">Error al cargar bridges.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {bridgeList.map((bridge) => {
          const template = (bridge.template_id ? templateById[bridge.template_id] : undefined)
            ?? (bridge.type ? templateBySlug[bridge.type] : undefined);
          const iconSrc = template
            ? (template.icon?.startsWith("http") ? template.icon : getConnectorIconUrl(template.name, template.slug))
            : getConnectorIconUrl(bridge.type, bridge.type);

          return (
            <Card
              key={bridge.id}
              className="hover-elevate cursor-pointer group"
              data-testid={`card-bridge-${bridge.id}`}
              onClick={() => setLocation(`/bridges/${bridge.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-100 rounded-lg flex-shrink-0">
                    <img
                      src={iconSrc}
                      alt={template?.name ?? bridge.type ?? bridge.name}
                      className="w-20 h-20 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-base font-semibold hidden">
                      {(bridge.type ?? bridge.name).slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base truncate">{bridge.name}</h3>
                          {bridge.is_default && (
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                          )}
                        </div>
                        {bridge.type && (
                          <div className="text-xs text-muted-foreground mt-1">{bridge.type}</div>
                        )}
                        {bridge.variants && Object.keys(bridge.variants).length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {Object.keys(bridge.variants).map((env) => (
                              <Badge key={env} variant="outline" className="text-xs capitalize px-1.5 py-0">
                                {env}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!confirm(`¿Eliminar bridge "${bridge.name}"?`)) return;
                          deleteBridge.mutate(bridge.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && !isError && bridgeList.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay bridges. Crea uno nuevo seleccionando un conector.
        </div>
      )}
    </div>
  );
}
