import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { connectorTemplates as connectorTemplatesApi } from "@/lib/api";
import { getConnectorIconUrl } from "@/utils/connectorIcons";
import type { ConnectorTemplate } from "@/lib/types";

export default function Connectors() {
  const { data: templates = [], isLoading } = useQuery<ConnectorTemplate[]>({
    queryKey: ["connector-templates"],
    queryFn: async () => {
      const res = await connectorTemplatesApi.list();
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object" && "items" in res && Array.isArray((res as { items: ConnectorTemplate[] }).items)) {
        return (res as { items: ConnectorTemplate[] }).items;
      }
      return [];
    },
  });

  return (
    <div className="p-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Conectores</h1>
        <p className="text-muted-foreground">
          Catálogo de conectores disponibles
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Cargando conectores...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover-elevate cursor-pointer"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-100 rounded-lg flex-shrink-0">
                    <img
                      src={template.icon?.startsWith("http") ? template.icon : getConnectorIconUrl(template.name, template.slug)}
                      alt={template.name}
                      className="w-20 h-20 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-base font-semibold hidden">
                      {template.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{template.name}</h3>
                    <div className="text-xs text-muted-foreground mt-1">
                      {template.slug}
                    </div>
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
