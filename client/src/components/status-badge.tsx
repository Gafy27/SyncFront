import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "connected" | "disconnected" | "active" | "inactive" | "warning" | "processing";
  testId?: string;
}

const statusConfig = {
  connected: { label: "Conectado", className: "bg-green-100 text-green-700 border-green-200" },
  disconnected: { label: "Desconectado", className: "bg-red-100 text-red-700 border-red-200" },
  active: { label: "Activo", className: "bg-green-100 text-green-700 border-green-200" },
  inactive: { label: "Inactivo", className: "bg-gray-100 text-gray-700 border-gray-200" },
  warning: { label: "Advertencia", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  processing: { label: "Procesando", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function StatusBadge({ status, testId }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={config.className} data-testid={testId}>
      <div className="w-2 h-2 rounded-full bg-current mr-1.5"></div>
      {config.label}
    </Badge>
  );
}
