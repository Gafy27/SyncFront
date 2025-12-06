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

import rockwellLogo from "@assets/image_1763374687620.png";
import abbLogo from "@assets/image_1763374691784.png";
import urLogo from "@assets/image_1763374694281.png";
import yaskawaLogo from "@assets/image_1763374696992.png";
import kukaLogo from "@assets/image_1763374699984.png";
import siemensLogo from "@assets/image_1763374701698.png";
import okumaLogo from "@assets/image_1763374704682.png";
import mqttLogo from "@assets/image_1763374706458.png";
import moriLogo from "@assets/image_1763374710638.png";
import modbusLogo from "@assets/image_1763374713069.png";
import mazakLogo from "@assets/image_1763374716014.png";
import loraLogo from "@assets/image_1763374719130.png";
import haasLogo from "@assets/image_1763374721742.png";
import fanucLogo from "@assets/image_1763374725354.png";



const allConnectors = [
  { id: "fanuc", name: "FANUC", logo: fanucLogo, protocol: "CNC Protocol" },
  { id: "haas", name: "HAAS", logo: haasLogo, protocol: "CNC Protocol" },
  { id: "siemens", name: "Siemens", logo: siemensLogo, protocol: "PLC Protocol" },
  { id: "abb", name: "ABB", logo: abbLogo, protocol: "Robot Controller" },
  { id: "mazak", name: "Mazak", logo: mazakLogo, protocol: "Machine Tool" },
  { id: "mqtt", name: "MQTT", logo: mqttLogo, protocol: "IoT Protocol" },
  { id: "modbus", name: "Modbus", logo: modbusLogo, protocol: "Industrial Protocol" },
  { id: "lora", name: "LoRa", logo: loraLogo, protocol: "Wireless Protocol" },
  { id: "dmg-mori", name: "DMG MORI", logo: moriLogo, protocol: "CNC Protocol" },
  { id: "okuma", name: "Okuma", logo: okumaLogo, protocol: "CNC Protocol" },
  { id: "kuka", name: "KUKA", logo: kukaLogo, protocol: "Robot Controller" },
  { id: "yaskawa", name: "Yaskawa", logo: yaskawaLogo, protocol: "Motion Control" },
  { id: "universal-robots", name: "Universal Robots", logo: urLogo, protocol: "Cobot Controller" },
  { id: "rockwell", name: "Rockwell Automation", logo: rockwellLogo, protocol: "PLC Protocol" },
];

const initialAppConnectors: Record<string, string[]> = {
  "1": ["fanuc", "haas", "siemens", "mqtt", "modbus", "mazak"],
  "2": ["abb", "kuka", "mqtt", "modbus"],
  "3": ["universal-robots", "mqtt"],
};

export default function Applications() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [locationPath, setLocation] = useLocation();
  const [appConnectors, setAppConnectors] = useState<Record<string, string[]>>(initialAppConnectors);
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
    queryKey: selectedOrg ? ['/api/organizations', selectedOrg, 'applications'] : ['applications-disabled'],
    enabled: !!selectedOrg,
  });

  // Fetch machines for selected app
  const { data: machines = [] } = useQuery<any[]>({
    queryKey: selectedOrg && selectedApp ? ['/api/organizations', selectedOrg, 'applications', selectedApp, 'devices'] : ['machines-disabled'],
    enabled: !!selectedOrg && !!selectedApp,
  });

  // Fetch event classes for selected app (needed for FunctionsTab)
  const { data: eventClasses = [] } = useQuery<any[]>({
    queryKey: selectedOrg && selectedApp ? ['/api/applications', selectedOrg, 'applications', selectedApp, 'event-classes'] : ['event-classes-disabled'],
    enabled: !!selectedOrg && !!selectedApp,
  });

  // Fetch application details for config
  const { data: applicationDetails } = useQuery<any>({
    queryKey: selectedOrg && selectedApp ? ['/api/organizations', selectedOrg, 'applications', selectedApp] : ['app-details-disabled'],
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

  useEffect(() => {
    const pending = sessionStorage.getItem("connector-link");
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        if (parsed?.appId && parsed?.connectorId) {
          setAppConnectors((prev) => {
            const current = prev[parsed.appId] || [];
            if (current.includes(parsed.connectorId)) {
              return prev;
            }
            return {
              ...prev,
              [parsed.appId]: [...current, parsed.connectorId],
            };
          });
        }
      } catch (err) {
        console.error("Error applying connector link:", err);
      } finally {
        sessionStorage.removeItem("connector-link");
      }
    }
  }, []);

  // Mutation to update application config
  const updateAppConfigMutation = useMutation({
    mutationFn: async (updateData: { name: string; description: string }) => {
      if (!selectedOrg || !selectedApp) {
        throw new Error("Organización y aplicación deben estar seleccionadas");
      }
      const response = await apiRequest(
        'PUT',
        `/api/organizations/${selectedOrg}/applications/${selectedApp}`,
        updateData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', selectedOrg, 'applications']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', selectedOrg, 'applications', selectedApp]
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
            applications.map((app: any) => (
              <Card
                key={app.applicationId}
                className="hover-elevate cursor-pointer"
                onClick={() => handleSelectApplication(app.applicationId)}
                data-testid={`card-application-${app.applicationId}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Boxes className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-app-name-${app.applicationId}`}>
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
            ))
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
