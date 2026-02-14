import { useRoute, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { connectors as connectorsApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { useOrganization } from "@/providers/organization-provider";
import type { Connector } from "@/lib/types";

export default function ConnectorDetail() {
  const [, params] = useRoute<{ applicationId: string; connectorId: string }>(
    "/connectors/:applicationId/:connectorId"
  );
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();

  const applicationId = params?.applicationId;
  const connectorId = params?.connectorId;

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collectionsData, setCollectionsData] = useState<
    Record<string, boolean>
  >({});
  const [connectorName, setConnectorName] = useState("");

  const {
    data: connector,
    isLoading,
    error,
  } = useQuery<Connector>({
    queryKey: ["connectors", selectedOrg, applicationId, connectorId],
    queryFn: () =>
      connectorsApi.get(selectedOrg!, applicationId!, connectorId!),
    enabled: !!selectedOrg && !!applicationId && !!connectorId,
  });

  useEffect(() => {
    if (connector) {
      setConnectorName(connector.name);
      setFormData(
        (connector.properties as Record<string, any>) || {}
      );
      const cols = connector.collections as Record<string, any> | undefined;
      if (cols && typeof cols === "object") {
        const colState: Record<string, boolean> = {};
        Object.entries(cols).forEach(([key, val]) => {
          colState[key] =
            typeof val === "object" && val !== null
              ? (val as any).used ?? true
              : !!val;
        });
        setCollectionsData(colState);
      }
    }
  }, [connector]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Connector>) =>
      connectorsApi.update(selectedOrg!, applicationId!, connectorId!, data),
    onSuccess: () => {
      toast({
        title: "Conector actualizado",
        description: "El conector se ha actualizado exitosamente.",
      });
      queryClient.invalidateQueries({
        queryKey: ["connectors", selectedOrg, applicationId, connectorId],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el conector.",
        variant: "destructive",
      });
    },
  });

  const handlePropertyChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCollectionToggle = (name: string, enabled: boolean) => {
    setCollectionsData((prev) => ({ ...prev, [name]: enabled }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connector) return;

    const connectorData: Partial<Connector> = {
      name: connectorName,
      properties: formData,
      collections: collectionsData,
    };

    updateMutation.mutate(connectorData);
  };

  if (isLoading) {
    return (
      <div className="p-10">
        <div className="text-center py-10">Cargando conector...</div>
      </div>
    );
  }

  if (error || !connector) {
    return (
      <div className="p-10">
        <div className="text-center py-10">
          <p className="text-destructive">Error al cargar el conector</p>
          <Button
            onClick={() =>
              setLocation(`/applications?app=${applicationId}`)
            }
            className="mt-4"
          >
            Volver a aplicaciones
          </Button>
        </div>
      </div>
    );
  }

  const properties = (connector.properties as Record<string, any>) || {};
  const collections = (connector.collections as Record<string, any>) || {};

  return (
    <div className="p-10">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() =>
            setLocation(`/applications?app=${applicationId}`)
          }
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a aplicaciones
        </Button>
        <h1 className="text-3xl font-semibold mb-2">Editar Conector</h1>
        <p className="text-muted-foreground">
          {connector.name} - {connector.driver || connector.template_id || ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Propiedades del Conector</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="connector-name">Nombre del Conector *</Label>
              <Input
                id="connector-name"
                value={connectorName}
                onChange={(e) => setConnectorName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              {Object.entries(properties).map(([key, defaultValue]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`prop-${key}`}>
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>
                  <Input
                    id={`prop-${key}`}
                    type={
                      key.toLowerCase().includes("password") ||
                      key.toLowerCase().includes("token")
                        ? "password"
                        : "text"
                    }
                    value={
                      formData[key] !== undefined
                        ? formData[key]
                        : defaultValue || ""
                    }
                    onChange={(e) => handlePropertyChange(key, e.target.value)}
                    placeholder={String(defaultValue || "")}
                  />
                </div>
              ))}
              {Object.keys(properties).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay propiedades configurables para este conector.
                </p>
              )}
            </div>

            {Object.keys(collections).length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-base font-semibold">Colecciones</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecciona las colecciones que deseas usar para este
                    conector
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(collections).map(
                    ([collectionName, collectionData]: [string, any]) => (
                      <div
                        key={collectionName}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex flex-col">
                          <Label
                            htmlFor={`collection-${collectionName}`}
                            className="font-medium cursor-pointer"
                          >
                            {collectionName}
                          </Label>
                          {collectionData?.variables && (
                            <span className="text-xs text-muted-foreground">
                              {Object.keys(collectionData.variables).length}{" "}
                              variables
                            </span>
                          )}
                        </div>
                        <Switch
                          id={`collection-${collectionName}`}
                          checked={collectionsData[collectionName] ?? false}
                          onCheckedChange={(checked) =>
                            handleCollectionToggle(collectionName, checked)
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending
                  ? "Guardando..."
                  : "Guardar Cambios"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (connector) {
                    setConnectorName(connector.name);
                    setFormData(
                      (connector.properties as Record<string, any>) || {}
                    );
                  }
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
