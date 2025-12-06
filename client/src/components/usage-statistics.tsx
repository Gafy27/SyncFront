import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface UsageItem {
  id: string;
  label: string;
  value: number;
  max: number;
  unit?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function UsageStatistics() {
  // Fetch CPU usage
  const { data: cpuData = [], isLoading: loadingCPU } = useQuery<any[]>({
    queryKey: ['/api/query/cpu'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/cpu`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Fetch RAM usage
  const { data: ramData = [], isLoading: loadingRAM } = useQuery<any[]>({
    queryKey: ['/api/query/ram'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/ram`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Fetch storage usage
  const { data: storageData = { storage: 0 }, isLoading: loadingStorage } = useQuery<{ storage: number }>({
    queryKey: ['/api/query/storage'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/storage`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Fetch events processed
  const { data: eventsProcessed = { count: 0 }, isLoading: loadingEvents } = useQuery<{ count: number }>({
    queryKey: ['/api/query/events/processed'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/events/processed`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Extract CPU usage percentage
  const cpuUsage = cpuData && cpuData.length > 0 && cpuData[0].cpu_usage !== undefined
    ? cpuData[0].cpu_usage
    : (cpuData && cpuData.length > 0 && cpuData[0].usage_idle !== undefined
      ? Math.round(100 - cpuData[0].usage_idle)
      : 0);

  // Extract RAM usage percentage
  const ramUsage = ramData && ramData.length > 0 && ramData[0].ram_usage !== undefined
    ? ramData[0].ram_usage
    : (ramData && ramData.length > 0 && ramData[0]['(100-available_percent)'] !== undefined
      ? Math.round(ramData[0]['(100-available_percent)'])
      : (ramData && ramData.length > 0 && ramData[0].usage_percent !== undefined
        ? Math.round(ramData[0].usage_percent)
        : 0));

  // Storage in GB (from queryStorage API)
  const storageGB = typeof storageData.storage === 'number' ? storageData.storage : 0;
  const storageMax = 1; // Max storage in GB (adjust as needed)

  // Events processed
  const eventsCount = eventsProcessed.count || 0;
  const eventsMax = 1000000; // Max events (adjust as needed)

  const usageData: UsageItem[] = [
    { id: "messages", label: "Mensajes Procesados", value: eventsCount, max: eventsMax, unit: "msg" },
    { id: "cpu", label: "CPU", value: cpuUsage, max: 100, unit: "%" },
    { id: "ram", label: "RAM", value: ramUsage, max: 100, unit: "%" },
    { id: "storage", label: "Almacenamiento", value: storageGB, max: storageMax, unit: "GB" },
  ];
  const formatValue = (item: UsageItem) => {
    if (item.unit === "%") {
      return `${item.value.toFixed(1)}${item.unit}`;
    }
    if (item.unit === "GB") {
      return `${item.value.toFixed(2)}${item.unit}`;
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
          {usageData.map((item) => {
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
