import { useEffect, useState, useMemo } from "react";
import { Plus, Boxes, Cpu, Cable, Tag, Code, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useOrganization } from "@/providers/organization-provider";
import { useToast } from "@/hooks/use-toast";
import { ApplicationMachinesTab } from "@/components/application-tabs/ApplicationMachinesTab";
import { ApplicationConnectorsTab } from "@/components/application-tabs/ApplicationConnectorsTab";
import { ApplicationEventClassesTab } from "@/components/application-tabs/ApplicationEventClassesTab";
import { ApplicationFunctionsTab } from "@/components/application-tabs/ApplicationFunctionsTab";
import { ApplicationConfigTab } from "@/components/application-tabs/ApplicationConfigTab";


export default function Applications() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [locationPath, setLocation] = useLocation();
  const [configName, setConfigName] = useState("");
  const [configDescription, setConfigDescription] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Read app query parameter from URL
  const appFromQuery = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("app");
  }, [locationPath]);

  // Auto-select application from query parameter
  useEffect(() => {
    if (appFromQuery !== selectedApp) {
      setSelectedApp(appFromQuery);
    }
  }, [appFromQuery]);

  const { selectedOrg } = useOrganization();

  // Fetch applications from API
  const { data: applications = [], isLoading } = useQuery<any[]>({
    queryKey: ['organizations', selectedOrg, 'applications'],
    queryFn: () => apiRequest('GET', `/api/organizations/${selectedOrg}/applications`),
    enabled: !!selectedOrg,
  });

  // Fetch machines for selected app
  const { data: machines = [] } = useQuery<any[]>({
    queryKey: ['organizations', selectedOrg, 'applications', selectedApp, 'machines'],
    queryFn: async () => {
      if (!selectedOrg || !selectedApp) return [];
      return apiRequest('GET', `/api/organizations/${selectedOrg}/applications/${selectedApp}/machines`);
    },
    enabled: !!selectedOrg && !!selectedApp,
  });

  // Fetch event classes for selected app (needed for FunctionsTab)
  const { data: eventClasses = [] } = useQuery<any[]>({
    queryKey: ['event-classes', selectedOrg, selectedApp],
    queryFn: async () => {
      if (!selectedOrg || !selectedApp) return [];
      return apiRequest('GET', `/api/organizations/${selectedOrg}/applications/${selectedApp}/event-classes`);
    },
    enabled: !!selectedOrg && !!selectedApp,
  });

  // Fetch application details for config
  const { data: applicationDetails } = useQuery<any>({
    queryKey: ['organizations', selectedOrg, 'applications', selectedApp, 'details'],
    queryFn: async () => {
      if (!selectedOrg || !selectedApp) return null;
      return apiRequest('GET', `/api/organizations/${selectedOrg}/applications/${selectedApp}`);
    },
    enabled: !!selectedOrg && !!selectedApp,
  });

  // Initialize config form when application details load
  useEffect(() => {
    if (applicationDetails) {
      setConfigName(applicationDetails.name || "");
      setConfigDescription(applicationDetails.description || "");
    }
  }, [applicationDetails]);

  const handleNewMachine = () => {
    if (selectedApp) {
      setLocation(`/machines/new/${selectedApp}`);
    } else {
      setLocation("/machines/new");
    }
  };

  const handleSelectApplication = (appId: string) => {
    setSelectedApp(appId);
    setLocation(`/applications?app=${appId}`);
  };

  const handleBackToApplications = () => {
    setSelectedApp(null);
    setLocation("/applications");
  };

  const handleAddConnector = () => {
    if (!selectedApp) {
      return;
    }
    setLocation(`/connectors?linkApp=${selectedApp}`);
  };

  // Mutation to update application config
  const updateAppConfigMutation = useMutation({
    mutationFn: async (updateData: { name: string; description: string }) => {
      if (!selectedOrg || !selectedApp) {
        throw new Error("Organización y aplicación deben estar seleccionadas");
      }
      return apiRequest(
        'PUT',
        `/api/organizations/${selectedOrg}/applications/${selectedApp}`,
        updateData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', selectedOrg, 'applications']
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', selectedOrg, 'applications', selectedApp]
      });
      toast({
        title: "Éxito",
        description: "Configuración de la aplicación actualizada correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la configuración",
        variant: "destructive",
      });
    }
  });

  const handleSaveConfig = () => {
    if (!configName.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive",
      });
      return;
    }
    updateAppConfigMutation.mutate({
      name: configName.trim(),
      description: configDescription.trim(),
    });
  };

  if (!selectedOrg) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">Selecciona una organización para ver sus aplicaciones.</p>
      </div>
    );
  }

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Aplicaciones</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
            Aplicaciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona las aplicaciones y sus flujos de datos
          </p>
        </div>
        <Button
          data-testid="button-add-application"
          onClick={() => setLocation("/applications/new")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Aplicación
        </Button>
      </div>

      {!selectedApp ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Cargando aplicaciones...
            </div>
          ) : applications.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No hay aplicaciones. Crea una nueva aplicación para comenzar.
            </div>
          ) : (
            applications.map((app: any) => {
              const appId = app.id || app.applicationId;
              return (
              <Card
                key={appId}
                className="hover-elevate cursor-pointer"
                onClick={() => handleSelectApplication(appId)}
                data-testid={`card-application-${appId}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Boxes className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-app-name-${appId}`}>
                          {app.name || app.applicationName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {app.description || ''}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      {app.status === "active" ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-2xl font-semibold">{app.deviceCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Máquinas</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-semibold">-</div>
                      <div className="text-xs text-muted-foreground">Clases</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-semibold">-</div>
                      <div className="text-xs text-muted-foreground">Conectores</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-semibold">-</div>
                      <div className="text-xs text-muted-foreground">Funciones</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </div>
      ) : (
        <div>
          <Button
            variant="ghost"
            onClick={handleBackToApplications}
            className="mb-6"
            data-testid="button-back-to-apps"
          >
            ← Volver a Aplicaciones
          </Button>

          <Tabs defaultValue="machines" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="machines" data-testid="tab-machines">
                <Cpu className="w-4 h-4 mr-2" />
                Máquinas
              </TabsTrigger>
              <TabsTrigger value="connectors" data-testid="tab-connectors">
                <Cable className="w-4 h-4 mr-2" />
                Conectores
              </TabsTrigger>
              <TabsTrigger value="classes" data-testid="tab-classes">
                <Tag className="w-4 h-4 mr-2" />
                Clases de Eventos
              </TabsTrigger>
              <TabsTrigger value="functions" data-testid="tab-functions">
                <Code className="w-4 h-4 mr-2" />
                Funciones
              </TabsTrigger>
              <TabsTrigger value="config" data-testid="tab-config">
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </TabsTrigger>
            </TabsList>

            <TabsContent value="machines">
              <ApplicationMachinesTab
                machines={machines}
                isLoading={isLoading}
                selectedApp={selectedApp}
                onNewMachine={handleNewMachine}
                onRowClick={(id) => setLocation(`/machines/${selectedApp}/${id}`)}
              />
            </TabsContent>

            <TabsContent value="connectors">
              <ApplicationConnectorsTab
                onAddConnector={handleAddConnector}
                applicationId={selectedApp || undefined}
                organizationId={selectedOrg || undefined}
              />
            </TabsContent>

            <TabsContent value="classes">
              <ApplicationEventClassesTab
                selectedOrg={selectedOrg}
                selectedApp={selectedApp}
              />
            </TabsContent>

            <TabsContent value="functions">
              <ApplicationFunctionsTab
                selectedOrg={selectedOrg}
                selectedApp={selectedApp}
                machines={machines}
                eventClasses={eventClasses}
              />
            </TabsContent>

            <TabsContent value="config">
              <ApplicationConfigTab
                configName={configName}
                configDescription={configDescription}
                isLoading={updateAppConfigMutation.isPending}
                onNameChange={setConfigName}
                onDescriptionChange={setConfigDescription}
                onSave={handleSaveConfig}
                onCancel={() => {
                  if (applicationDetails) {
                    setConfigName(applicationDetails.name || "");
                    setConfigDescription(applicationDetails.description || "");
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
