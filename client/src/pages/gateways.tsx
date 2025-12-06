import { useMemo, useState } from "react";
import { Plus, Search, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useOrganization } from "@/providers/organization-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Gateway {
  gatewayId: string;
  name: string;
  location?: string;
  status?: string;
  devices?: number;
  lastSeen?: string;
}

export default function Gateways() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [gatewayForm, setGatewayForm] = useState({
    gatewayId: "",
    name: "",
    location: "",
    status: "connected",
  });
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { organizations, selectedOrg, isLoading: orgLoading } = useOrganization();

  const {
    data: gateways = [],
    isLoading: gatewaysLoading,
    error: gatewaysError,
    refetch: refetchGateways,
  } = useQuery<Gateway[]>({
    queryKey: selectedOrg ? ['/api/organizations', selectedOrg, 'gateways'] : ['gateways-disabled'],
    enabled: !!selectedOrg,
  });

  const filteredGateways = useMemo(() => {
    return gateways.filter((gateway) =>
      gateway.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gateway.gatewayId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [gateways, searchQuery]);

  const handleGatewaySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);

    if (!selectedOrg || !gatewayForm.gatewayId.trim() || !gatewayForm.name.trim()) {
      setFormMessage({ type: "error", text: "Completa todos los campos obligatorios." });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiRequest("POST", `/api/organizations/${selectedOrg}/gateways`, {
        gatewayId: gatewayForm.gatewayId.trim(),
        name: gatewayForm.name.trim(),
        location: gatewayForm.location.trim(),
        status: gatewayForm.status,
      });
      await response.json();
      setFormMessage({ type: "success", text: "Gateway agregado correctamente." });
      setGatewayForm({
        gatewayId: "",
        name: "",
        location: "",
        status: "connected",
      });
      setShowForm(false);
      refetchGateways();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error agregando gateway.";
      setFormMessage({ type: "error", text: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Gateways</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Gateways</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona una organización para ver y agregar gateways
          </p>
        </div>
        <Button data-testid="button-add-gateway" onClick={() => setShowForm(true)} disabled={!selectedOrg}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Gateway
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar gateways..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-gateways"
            disabled={!selectedOrg}
          />
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Gateway</DialogTitle>
            <DialogDescription>
              Registra un nuevo gateway para la organización seleccionada.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleGatewaySubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gateway ID</Label>
                  <Input
                    value={gatewayForm.gatewayId}
                    onChange={(e) => setGatewayForm((prev) => ({ ...prev, gatewayId: e.target.value }))}
                    placeholder="Ej: GATE-01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={gatewayForm.name}
                    onChange={(e) => setGatewayForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre descriptivo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <Input
                    value={gatewayForm.location}
                    onChange={(e) => setGatewayForm((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Ubicación opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={gatewayForm.status}
                    onValueChange={(value) => setGatewayForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="connected">Conectado</SelectItem>
                      <SelectItem value="disconnected">Desconectado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formMessage && (
                <div
                  className={
                    formMessage.type === "success"
                      ? "text-emerald-600 text-sm"
                      : "text-destructive text-sm"
                  }
                >
                  {formMessage.text}
                </div>
              )}

              <Button type="submit" disabled={submitting || !selectedOrg}>
                {submitting ? "Guardando..." : "Guardar Gateway"}
              </Button>
            </form>
        </DialogContent>
      </Dialog>

      {orgLoading && (
        <div className="text-muted-foreground">Cargando organizaciones...</div>
      )}

  {selectedOrg ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gatewaysLoading ? (
            <div className="text-muted-foreground">Cargando gateways...</div>
          ) : gatewaysError ? (
            <div className="text-destructive">No se pudieron cargar los gateways.</div>
          ) : filteredGateways.length === 0 ? (
            <div className="text-muted-foreground">No hay gateways registrados.</div>
          ) : (
            filteredGateways.map((gateway) => (
              <Card key={gateway.gatewayId} className="hover-elevate" data-testid={`card-gateway-${gateway.gatewayId}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-mono text-muted-foreground mb-1">{gateway.gatewayId}</p>
                      <h3 className="font-semibold" data-testid={`text-gateway-name-${gateway.gatewayId}`}>{gateway.name}</h3>
                    </div>
                    <StatusBadge status={(gateway.status as any) || "connected"} testId={`badge-status-${gateway.gatewayId}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gateway.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm text-muted-foreground">{gateway.location}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Dispositivos:</span>
                        <span className="text-lg font-semibold text-primary">{gateway.devices ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Última vez:</span>
                        <span className="text-sm">{gateway.lastSeen ?? "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
      )}
    </div>
  ) : (
    <div className="text-muted-foreground">Selecciona una organización para ver sus gateways.</div>
  )}
    </div>
  );
}
