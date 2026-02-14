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
import { queryClient } from "@/lib/queryClient";
import { connectors as connectorsApi, API_BASE_URL } from "@/lib/api";
import { useOrganization } from "@/providers/organization-provider";
import { getConnectorIconUrl } from "@/utils/connectorIcons";

// Types for the connector template format from /api/connector-templates
interface ConnectorVariable {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  default?: any;
}

interface TemplateCollection {
  name: string;
  label?: string;
}

interface ConnectorTemplate {
  id: string;
  name: string;
  slug: string;
  driver: string;
  version: string;
  is_active: boolean;
  variables: ConnectorVariable[];
  collections?: TemplateCollection[];
  description?: string;
}

export default function NewConnector() {
  const [, setLocation] = useLocation();
  const [, paramsSelect] = useRoute<{ applicationId: string }>('/connectors/new/:applicationId');
  const [, paramsConfig] = useRoute<{ applicationId: string; templateId: string }>('/connectors/new/:applicationId/:templateId');
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collectionsData, setCollectionsData] = useState<Record<string, { used: boolean }>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const applicationId = paramsConfig?.applicationId || paramsSelect?.applicationId;
  const templateId = paramsConfig?.templateId;

  // Fetch all connector templates for selection & for form building
  const { data: connectorTemplates = [], isLoading } = useQuery<ConnectorTemplate[]>({
    queryKey: ['/api/connector-templates', selectedOrg],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/connector-templates`, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch connector templates');
      return await res.json();
    },
    enabled: !!selectedOrg,
  });

  // Filter templates for search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return connectorTemplates;
    const query = searchQuery.toLowerCase();
    return connectorTemplates.filter((template) =>
      template.name.toLowerCase().includes(query) ||
      template.driver.toLowerCase().includes(query) ||
      (template.description && template.description.toLowerCase().includes(query))
    );
  }, [connectorTemplates, searchQuery]);

  // Find the template matching the selected templateId
  const selectedTemplate: ConnectorTemplate | undefined = templateId
    ? connectorTemplates.find((tpl) => tpl.id === templateId)
    : undefined;

  // When a template is selected, initialize form with its defaults
  useEffect(() => {
    if (selectedTemplate) {
      const initial: Record<string, any> = {};
      selectedTemplate.variables.forEach((v) => {
        if (typeof v.default !== "undefined") {
          initial[v.name] = v.default;
        }
      });
      setFormData({ ...initial });
      if (selectedTemplate.collections && selectedTemplate.collections.length > 0) {
        const initCol: Record<string, { used: boolean }> = {};
        selectedTemplate.collections.forEach((col) => {
          initCol[col.name] = { used: false };
        });
        setCollectionsData(initCol);
      }
    }
  }, [selectedTemplate]);

  // Create connector via correct API route
  const createConnectorMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!applicationId) throw new Error('Application ID is required');
      if (!selectedOrg) throw new Error('Organization ID is required');
      return connectorsApi.create(selectedOrg, applicationId, data);
    },
    onSuccess: () => {
      toast({
        title: "Conector creado",
        description: "El conector se ha creado exitosamente.",
      });
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: ['connectors', selectedOrg, applicationId] });
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

  // When selecting from the list, redirect with new connector template id
  const handleConnectorSelect = (templateId: string) => {
    if (!applicationId) {
      toast({ title: "Error", description: "Application ID is required.", variant: "destructive" });
      return;
    }
    setLocation(`/connectors/new/${applicationId}/${templateId}`);
  };

  // Change handler for connector parameter fields
  const handlePropertyChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Toggle collection 'used'
  const handleCollectionToggle = (collectionName: string, enabled: boolean) => {
    setCollectionsData(prev => ({
      ...prev,
      [collectionName]: {
        ...((prev && prev[collectionName]) || {}),
        used: enabled,
      },
    }));
  };

  // Submit handler that uses template schema
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const { name, ...props } = formData;

    if (!applicationId) {
      toast({ title: "Error", description: "Application ID is required.", variant: "destructive" });
      return;
    }

    // Build up collections as expected by the API
    let collectionsPayload: Record<string, any> = {};
    if (selectedTemplate.collections) {
      selectedTemplate.collections.forEach(col => {
        collectionsPayload[col.name] = { used: collectionsData[col.name]?.used || false };
      });
    }
    // Build up properties (only those present in template, with value).
    const propPayload: Record<string, any> = {};
    selectedTemplate.variables.forEach(v => {
      if (typeof props[v.name] !== "undefined") {
        propPayload[v.name] = props[v.name];
      }
    });

    const connectorData = {
      application_id: applicationId,
      organization_id: selectedOrg,
      name: name || selectedTemplate.name,
      template_id: templateId,
      driver: selectedTemplate.driver,
      properties: propPayload,
      collections: collectionsPayload,
    };

    createConnectorMutation.mutate(connectorData);
  };

  // If a connector template was chosen, show the configuration form
  if (templateId && selectedTemplate) {
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
          <h1 className="text-3xl font-semibold mb-2">Configurar Conector</h1>
          <p className="text-muted-foreground">
            {selectedTemplate.name} - {selectedTemplate.driver}
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
                  value={formData.name ?? ""}
                  onChange={(e) => handlePropertyChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-4">
                {/* Render form fields for each variable/parameter in the connector template */}
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 ? selectedTemplate.variables.map((variable) => {
                  let type = "text";
                  if (variable.type === "integer" || variable.type === "number") type = "number";
                  if (
                    variable.type === "password" ||
                    variable.name.toLowerCase().includes("password") ||
                    variable.name.toLowerCase().includes("token")
                  ) {
                    type = "password";
                  }
                  return (
                    <div key={variable.name} className="space-y-2">
                      <Label htmlFor={`var-${variable.name}`}>
                        {variable.label || variable.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {variable.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Input
                        id={`var-${variable.name}`}
                        type={type}
                        value={
                          formData[variable.name] !== undefined
                            ? formData[variable.name]
                            : (typeof variable.default !== "undefined" ? String(variable.default) : "")
                        }
                        onChange={e => handlePropertyChange(variable.name, type === 'number' ? Number(e.target.value) : e.target.value)}
                        required={!!variable.required}
                        placeholder={typeof variable.default !== "undefined" ? String(variable.default) : ""}
                      />
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted-foreground">No hay variables configurables para este conector.</p>
                )}
              </div>
              {selectedTemplate.collections && selectedTemplate.collections.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="text-base font-semibold">Colecciones</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecciona las colecciones que deseas usar para este conector
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTemplate.collections.map((col) => (
                      <div key={col.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex flex-col">
                          <Label htmlFor={`collection-${col.name}`} className="font-medium cursor-pointer">
                            {col.label || col.name}
                          </Label>
                        </div>
                        <Switch
                          id={`collection-${col.name}`}
                          checked={collectionsData[col.name]?.used || false}
                          onCheckedChange={(checked) => handleCollectionToggle(col.name, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <Button type="submit" disabled={createConnectorMutation.isPending}>
                  {createConnectorMutation.isPending ? 'Creando...' : 'Crear Conector'}
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

  // If no app was selected, return error message
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

  // Show the list of connector templates to choose from
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
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover-elevate cursor-pointer"
                onClick={() => handleConnectorSelect(template.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-100 rounded-lg flex-shrink-0">
                      <img
                        src={getConnectorIconUrl(template.name, template.driver)}
                        alt={template.name}
                        className="w-20 h-20 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-base font-semibold hidden">
                        {template.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{template.name}</h3>
                      <span className="text-xs text-muted-foreground">{template.driver}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredTemplates.length === 0 && searchQuery && (
            <div className="text-center py-10 text-muted-foreground">
              No se encontraron conectores que coincidan con "{searchQuery}"
            </div>
          )}
        </>
      )}
    </div>
  );
}
