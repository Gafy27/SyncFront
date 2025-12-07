import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useOrganization } from "@/providers/organization-provider";
import { getConnectorIconUrl } from "@/utils/connectorIcons";

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

export default function NewConnector() {
  const [, setLocation] = useLocation();
  const [, paramsNew] = useRoute<{ applicationId: string; connectorId?: string }>('/connectors/new/:applicationId/:connectorId?');
  const [, paramsEdit] = useRoute<{ applicationId: string; connectorId: string }>('/connectors/edit/:applicationId/:connectorId');
  const params = paramsNew || paramsEdit;
  const isEditMode = !!paramsEdit;
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collectionsData, setCollectionsData] = useState<Record<string, { used: boolean; variables: Record<string, any> }>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const applicationId = params?.applicationId;
  const connectorId = params?.connectorId;


  const { data: defaultConnectors = [], isLoading } = useQuery<Connector[]>({
    queryKey: ['/api/organizations/:organizationId/connectors', selectedOrg],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/organizations/${selectedOrg}/connectors`, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch connectors');
      const connectors = await res.json();
      return connectors.filter((c: Connector) => !c.applicationId);
    },
    enabled: !!selectedOrg && !connectorId && !!applicationId,
  });

  const filteredConnectors = useMemo(() => {
    if (!searchQuery.trim()) return defaultConnectors;
    const query = searchQuery.toLowerCase();
    return defaultConnectors.filter((connector) =>
      connector.name.toLowerCase().includes(query) ||
      connector.driver.toLowerCase().includes(query) ||
      (connector.description && connector.description.toLowerCase().includes(query))
    );
  }, [defaultConnectors, searchQuery]);

  const { data: selectedConnector, isLoading: isLoadingConnector } = useQuery<Connector | null>({
    queryKey: isEditMode 
      ? ['/api/applications/:organizationId/applications/:applicationId/connectors', selectedOrg, applicationId, connectorId]
      : ['/api/organizations/:organizationId/connectors', selectedOrg, connectorId],
    queryFn: async () => {
      if (!connectorId) return null;
      if (isEditMode && applicationId) {
        const res = await fetch(`${API_BASE_URL}/api/applications/${selectedOrg}/applications/${applicationId}/connectors`, { credentials: "include" });
        if (!res.ok) throw new Error('Failed to fetch connectors');
        const connectors = await res.json();
        return connectors.find((c: Connector) => c._id === connectorId) || null;
      } else {
        const res = await fetch(`${API_BASE_URL}/api/organizations/${selectedOrg}/connectors/${connectorId}`, { credentials: "include" });
        if (!res.ok) throw new Error('Failed to fetch connector');
        return res.json();
      }
    },
    enabled: !!selectedOrg && !!connectorId && (isEditMode ? !!applicationId : true),
  });

  useEffect(() => {
    if (selectedConnector) {
      setFormData({ name: selectedConnector.name, ...selectedConnector.properties });
      setCollectionsData(selectedConnector.collections || {});
    }
  }, [selectedConnector]);

  const createConnectorMutation = useMutation({
    mutationFn: async (data: Partial<Connector>) => {
      if (!applicationId) {
        throw new Error('Application ID is required');
      }
      if (!selectedOrg) {
        throw new Error('Organization ID is required');
      }
      const endpoint = `/api/applications/${selectedOrg}/applications/${applicationId}/connectors`;
      
      const res = await apiRequest('POST', endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Conector creado",
        description: "El conector se ha creado exitosamente.",
      });
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/applications/:organizationId/applications/:applicationId/connectors', selectedOrg, applicationId] });
        setLocation(`/applications?app=${applicationId}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el conector.",
        variant: "destructive",
      });
    },
  });

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
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/applications/:organizationId/applications/:applicationId/connectors', selectedOrg, applicationId] });
        setLocation(`/applications?app=${applicationId}`);
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

  const handleConnectorSelect = (selectedConnectorId: string) => {
    if (!applicationId) {
      toast({
        title: "Error",
        description: "Application ID is required.",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/connectors/new/${applicationId}/${selectedConnectorId}`);
  };

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
    if (!selectedConnector) return;

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
      name: name || selectedConnector.name,
      driver: selectedConnector.driver,
      description: `Connector ${name || selectedConnector.name} for application`,
      properties: properties,
      collections: collectionsData,
      organizationId: selectedOrg || selectedConnector.organizationId,
    };

    if (isEditMode) {
      updateConnectorMutation.mutate(connectorData);
    } else {
      createConnectorMutation.mutate(connectorData);
    }
  };

  if (isLoadingConnector) {
    return (
      <div className="p-10">
        <div className="text-center py-10">Cargando conector...</div>
      </div>
    );
  }

  if (selectedConnector) {
    return (
      <div className="p-10">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (applicationId) {
                setLocation(`/connectors/new/${applicationId}`);
              } else {
                setLocation('/connectors');
              }
            }}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a conectores
          </Button>
          <h1 className="text-3xl font-semibold mb-2">{isEditMode ? 'Editar' : 'Configurar'} Conector</h1>
          <p className="text-muted-foreground">
            {selectedConnector.name} - {selectedConnector.driver}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Editar' : 'Propiedades del'} Conector</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="connector-name">Nombre del Conector *</Label>
                <Input
                  id="connector-name"
                  value={formData.name || selectedConnector.name}
                  onChange={(e) => handlePropertyChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                {Object.entries(selectedConnector.properties || {}).map(([key, defaultValue]) => (
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
                {Object.keys(selectedConnector.properties || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay propiedades configurables para este conector.</p>
                )}
              </div>

              {Object.keys(selectedConnector.collections || {}).length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="text-base font-semibold">Colecciones</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecciona las colecciones que deseas usar para este conector
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedConnector.collections || {}).map(([collectionName, collectionData]: [string, any]) => (
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
                <Button type="submit" disabled={isEditMode ? updateConnectorMutation.isPending : createConnectorMutation.isPending}>
                  {isEditMode 
                    ? (updateConnectorMutation.isPending ? 'Guardando...' : 'Guardar Cambios')
                    : (createConnectorMutation.isPending ? 'Creando...' : 'Crear Conector')
                  }
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/connectors')}
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

  if (!applicationId) {
    return (
      <div className="p-10">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/applications')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Aplicaciones
          </Button>
          <h1 className="text-3xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground">
            Se requiere un ID de aplicación para crear un conector.
          </p>
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
          Volver a Aplicación
        </Button>
        <h1 className="text-3xl font-semibold mb-2">Agregar Nuevo Conector</h1>
        <p className="text-muted-foreground">
          Selecciona un conector base para configurar
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Cargando conectores...</div>
      ) : (
        <>
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conectores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredConnectors.map((connector) => (
            <Card
              key={connector._id}
              className="hover-elevate cursor-pointer"
              onClick={() => handleConnectorSelect(connector._id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-100 rounded-lg flex-shrink-0">
                    <img
                      src={getConnectorIconUrl(connector.name, connector.driver)}
                      alt={connector.name}
                      className="w-20 h-20 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-base font-semibold hidden">
                      {connector.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{connector.name}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
          {filteredConnectors.length === 0 && searchQuery && (
            <div className="text-center py-10 text-muted-foreground">
              No se encontraron conectores que coincidan con "{searchQuery}"
            </div>
          )}
        </>
      )}
    </div>
  );
}

