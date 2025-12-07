import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/providers/organization-provider";
import { getConnectorIconUrl } from "@/utils/connectorIcons";

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
console.log('API_BASE_URL', API_BASE_URL);
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

export default function Connectors() {
  const [locationPath, setLocation] = useLocation();
  const { selectedOrg } = useOrganization();

  // Check if there's an application ID in the URL query params
  const appFromQuery = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("app");
  }, [locationPath]);

  const { data: connectors = [], isLoading } = useQuery<Connector[]>({
    queryKey: ['/api/organizations/:organizationId/connectors', selectedOrg],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/organizations/${selectedOrg}/connectors`, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch connectors');
      const connectors = await res.json();
      return connectors.filter((c: Connector) => !c.applicationId);
    },
    enabled: !!selectedOrg,
  });

  const handleConnectorClick = (connectorId: string) => {
    // If there's an app in the query, go directly to connector creation
    if (appFromQuery) {
      setLocation(`/connectors/new/${appFromQuery}/${connectorId}`);
    } else {
      // Otherwise, go to applications to select one first
      setLocation('/applications');
    }
  };

  return (
    <div className="p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Conectores</h1>
          <p className="text-muted-foreground">
            Selecciona un conector base para configurar
          </p>
        </div>
        <Button onClick={() => setLocation('/connectors/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Conector
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Cargando conectores...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {connectors.map((connector) => (
            <Card
              key={connector._id}
              className="hover-elevate cursor-pointer"
              onClick={() => handleConnectorClick(connector._id)}
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
      )}
    </div>
  );
}
