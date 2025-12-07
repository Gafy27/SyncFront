import { useRoute, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useOrganization } from "@/providers/organization-provider";

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface Connector {
  _id: string;
  name: string;
  driver: string;
  description?: string;
  properties: Record<string, any>;
  collections: Record<string, any>;
  organizationId?: string;
  applicationId?: string;
}

export default function ConnectorDetail() {
  const [, params] = useRoute<{ applicationId: string; connectorId: string }>("/connectors/:applicationId/:connectorId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();

  const applicationId = params?.applicationId;
  const connectorId = params?.connectorId;

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collectionsData, setCollectionsData] = useState<Record<string, { used: boolean; variables: Record<string, any> }>>({});

  const { data: connector, isLoading, error } = useQuery<Connector | null>({
    queryKey: ['/api/applications/:organizationId/applications/:applicationId/connectors', selectedOrg, applicationId, connectorId],
    queryFn: async () => {
      if (!applicationId || !connectorId || !selectedOrg) return null;
      const res = await fetch(`${API_BASE_URL}/api/applications/${selectedOrg}/applications/${applicationId}/connectors`, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch connectors');
      const connectors = await res.json();
      return connectors.find((c: Connector) => c._id === connectorId) || null;
    },
    enabled: !!selectedOrg && !!applicationId && !!connectorId,
  });

  useEffect(() => {
    if (connector) {
      setFormData({ name: connector.name, ...connector.properties });
      setCollectionsData(connector.collections || {});
    }
  }, [connector]);

  const updateConnectorMutation = useMutation({
    mutationFn: async (data: Partial<Connector>) => {
      if (!applicationId || !connectorId) {
        throw new Error('Application ID and Connector ID are required');
      }
      if (!selectedOrg) {
        throw new Error('Organization ID is required');
      }
      const endpoint = `/api/applications/${selectedOrg}/applications/${applicationId}/connectors/${connectorId}`;
      
      const res = await apiRequest('PUT', endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Conector actualizado",
        description: "El conector se ha actualizado exitosamente.",
      });
      if (applicationId && connectorId) {
        queryClient.invalidateQueries({ queryKey: ['/api/applications/:organizationId/applications/:applicationId/connectors', selectedOrg, applicationId] });
      }
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
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCollectionToggle = (collectionName: string, enabled: boolean) => {
    setCollectionsData(prev => ({
      ...prev,
      [collectionName]: {
        ...prev[collectionName],
        used: enabled,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connector) return;

    const { name, ...properties } = formData;

    if (!applicationId) {
      toast({
        title: "Error",
        description: "Application ID is required.",
        variant: "destructive",
      });
      return;
    }

    const connectorData: Partial<Connector> = {
      name: name || connector.name,
      driver: connector.driver,
      description: connector.description || `Connector ${name || connector.name} for application`,
      properties: properties,
      collections: collectionsData,
      organizationId: selectedOrg || connector.organizationId,
    };

    updateConnectorMutation.mutate(connectorData);
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
          <Button onClick={() => setLocation(`/applications?app=${applicationId}`)} className="mt-4">
            Volver a aplicaciones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/applications?app=${applicationId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a aplicaciones
        </Button>
        <h1 className="text-3xl font-semibold mb-2">Editar Conector</h1>
        <p className="text-muted-foreground">
          {connector.name} - {connector.driver}
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
                value={formData.name || connector.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              {Object.entries(connector.properties || {}).map(([key, defaultValue]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`prop-${key}`}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  <Input
                    id={`prop-${key}`}
                    type={key.toLowerCase().includes('password') || key.toLowerCase().includes('token') ? 'password' : 'text'}
                    value={formData[key] !== undefined ? formData[key] : (defaultValue || '')}
                    onChange={(e) => handlePropertyChange(key, e.target.value)}
                    placeholder={String(defaultValue || '')}
                  />
                </div>
              ))}
              {Object.keys(connector.properties || {}).length === 0 && (
                <p className="text-sm text-muted-foreground">No hay propiedades configurables para este conector.</p>
              )}
            </div>

            {Object.keys(connector.collections || {}).length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-base font-semibold">Colecciones</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecciona las colecciones que deseas usar para este conector
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(connector.collections || {}).map(([collectionName, collectionData]: [string, any]) => (
                    <div key={collectionName} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex flex-col">
                        <Label htmlFor={`collection-${collectionName}`} className="font-medium cursor-pointer">
                          {collectionName}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(collectionData?.variables || {}).length} variables
                        </span>
                      </div>
                      <Switch
                        id={`collection-${collectionName}`}
                        checked={collectionsData[collectionName]?.used || false}
                        onCheckedChange={(checked) => handleCollectionToggle(collectionName, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={updateConnectorMutation.isPending}>
                {updateConnectorMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (connector) {
                    setFormData({ name: connector.name, ...connector.properties });
                    setCollectionsData(connector.collections || {});
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

