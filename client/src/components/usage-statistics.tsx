import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UsageItem {
  id: string;
  label: string;
  value: number;
  max: number;
  unit?: string;
}

const mockUsageData: UsageItem[] = [
  { id: "messages", label: "Mensajes Procesados", value: 847520, max: 1000000, unit: "msg" },
  { id: "cpu", label: "CPU", value: 42, max: 100, unit: "%" },
  { id: "ram", label: "RAM", value: 68, max: 100, unit: "%" },
  { id: "apps", label: "Aplicaciones", value: 12, max: 20, unit: "apps" },
  { id: "data-records", label: "Registros de Datos", value: 324500, max: 500000, unit: "records" },
  { id: "storage", label: "Almacenamiento", value: 35, max: 100, unit: "GB" },
  { id: "api-calls", label: "Llamadas API", value: 18450, max: 50000, unit: "calls" },
  { id: "webhooks", label: "Webhooks Activos", value: 8, max: 15, unit: "hooks" },
];

export function UsageStatistics() {
  const formatValue = (item: UsageItem) => {
    if (item.unit === "%" || item.unit === "GB") {
      return `${item.value}${item.unit}`;
    }
    if (item.value >= 1000) {
      return `${(item.value / 1000).toFixed(1)}k ${item.unit || ""}`;
    }
    return `${item.value} ${item.unit || ""}`;
  };

  const formatMax = (item: UsageItem) => {
    if (item.unit === "%" || item.unit === "GB") {
      return `${item.max}${item.unit}`;
    }
    if (item.max >= 1000) {
      return `${(item.max / 1000).toFixed(0)}k`;
    }
    return item.max;
  };

  return (
    <Card data-testid="card-usage-statistics">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Estadísticas de Uso
        </CardTitle>
        <Button variant="ghost" size="icon" data-testid="button-refresh-usage">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockUsageData.map((item) => {
            const percentage = (item.value / item.max) * 100;
            return (
              <div key={item.id} className="space-y-2" data-testid={`usage-item-${item.id}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">
                    {formatValue(item)} / {formatMax(item)}
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                  data-testid={`progress-${item.id}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
