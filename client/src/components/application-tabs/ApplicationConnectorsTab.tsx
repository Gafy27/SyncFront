import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getConnectorIconUrl } from "@/utils/connectorIcons";

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiConnector {
  _id: string;
  name: string;
  driver: string;
  properties: Record<string, any>;
  collections: Record<string, any>;
  organizationId?: string;
  applicationId?: string;
}

interface ApplicationConnectorsTabProps {
  onAddConnector: () => void;
  applicationId?: string;
  organizationId?: string;
}

export function ApplicationConnectorsTab({
  onAddConnector,
  applicationId,
  organizationId,
}: ApplicationConnectorsTabProps) {
  const [, setLocation] = useLocation();

  const { data: appConnectors = [], isLoading } = useQuery<ApiConnector[]>({
    queryKey: ['/api/applications/:organizationId/applications/:applicationId/connectors', organizationId, applicationId],
    queryFn: async () => {
      if (!organizationId || !applicationId) return [];
      const res = await fetch(`${API_BASE_URL}/api/applications/${organizationId}/applications/${applicationId}/connectors`, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch connectors');
      const connectors = await res.json();
      return connectors;
    },
    enabled: !!organizationId && !!applicationId,
  });

  const handleAddClick = () => {
    if (applicationId) {
      setLocation(`/connectors/new/${applicationId}`);
    } else {
      onAddConnector();
    }
  };
  return (
    <>
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Conectores</h2>
          <p className="text-sm text-muted-foreground">
            Vincula conectores existentes desde el catálogo global
          </p>
        </div>
      </div>
      {isLoading ? (
        <div className="text-center py-10">Cargando conectores...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {appConnectors.map((connector) => (
            <Card 
              key={connector._id} 
              className="hover-elevate cursor-pointer" 
              data-testid={`card-app-connector-${connector._id}`}
              onClick={() => {
                if (applicationId) {
                  setLocation(`/connectors/${applicationId}/${connector._id}`);
                }
              }}
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
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-700 border-green-200 mt-2 text-sm"
                    >
                      Conectado
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        <Card
          key="add-connector"
          className="border-2 border-dashed hover-elevate cursor-pointer"
          data-testid="card-add-connector-to-app"
          onClick={handleAddClick}
        >
          <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Vincular Conector
            </p>
          </CardContent>
        </Card>
      </div>
      )}
    </>
  );
}

