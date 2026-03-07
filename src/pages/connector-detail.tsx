import { useRoute, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { bridges as bridgesApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { useOrganization } from "@/providers/organization-provider";
import type { Bridge } from "@/lib/types";

export default function BridgeDetail() {
  const [, params] = useRoute<{ bridgeId: string }>("/bridges/:bridgeId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();

  const bridgeId = params?.bridgeId;

  const [bridgeName, setBridgeName] = useState("");
  const [configData, setConfigData] = useState<Record<string, any>>({});

  const { data: bridge, isLoading, error } = useQuery<Bridge>({
    queryKey: ["organizations", selectedOrg, "bridges", bridgeId],
    queryFn: () => bridgesApi.get(selectedOrg!, bridgeId!),
    enabled: !!selectedOrg && !!bridgeId,
  });

  useEffect(() => {
    if (bridge) {
      setBridgeName(bridge.name);
      setConfigData((bridge.config as Record<string, any>) || {});
    }
  }, [bridge]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Bridge>) =>
      bridgesApi.update(selectedOrg!, bridgeId!, data),
    onSuccess: () => {
      toast({ title: "Bridge actualizado" });
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "bridges", bridgeId] });
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "bridges"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleConfigChange = (key: string, value: any) => {
    setConfigData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bridge) return;
    updateMutation.mutate({ name: bridgeName, config: configData });
  };

  if (isLoading) {
    return <div className="p-10 text-center">Cargando bridge...</div>;
  }

  if (error || !bridge) {
    return (
      <div className="p-10 text-center">
        <p className="text-destructive">Error al cargar el bridge</p>
        <Button onClick={() => setLocation("/bridges")} className="mt-4">
          Volver a Bridges
        </Button>
      </div>
    );
  }

  const config = (bridge.config as Record<string, any>) || {};

  return (
    <div className="p-10">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/bridges")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Bridges
        </Button>
        <h1 className="text-3xl font-semibold mb-2">Editar Bridge</h1>
        <p className="text-muted-foreground">
          {bridge.name}{bridge.type ? ` — ${bridge.type}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Propiedades del Bridge</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bridge-name">Nombre del Bridge *</Label>
              <Input
                id="bridge-name"
                value={bridgeName}
                onChange={(e) => setBridgeName(e.target.value)}
                className="font-mono"
                required
              />
            </div>

            <div className="space-y-4">
              {Object.entries(config).map(([key, defaultValue]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`conf-${key}`}>
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>
                  <Input
                    id={`conf-${key}`}
                    type={
                      key.toLowerCase().includes("password") || key.toLowerCase().includes("token")
                        ? "password"
                        : "text"
                    }
                    value={configData[key] != null ? String(configData[key]) : String(defaultValue ?? "")}
                    onChange={(e) => handleConfigChange(key, e.target.value)}
                    placeholder={String(defaultValue || "")}
                  />
                </div>
              ))}
              {Object.keys(config).length === 0 && (
                <p className="text-sm text-muted-foreground">No hay propiedades configurables.</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/bridges")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
