import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { machines as machinesApi } from "@/lib/api";
import type { Machine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { MachinesTable } from "@/components/machines-table";

export default function MachinesPage() {
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: machineList = [] } = useQuery<Machine[]>({
    queryKey: ["organizations", selectedOrg, "machines"],
    queryFn: async () => {
      const res = await machinesApi.list(selectedOrg!);
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object") {
        const o = res as Record<string, unknown>;
        const key = Object.keys(o).find((k) => Array.isArray(o[k]));
        if (key) return o[key] as Machine[];
      }
      return [];
    },
    enabled: !!selectedOrg,
  });

  const deleteMachine = useMutation({
    mutationFn: (machineId: string) => machinesApi.delete(selectedOrg!, machineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "machines"] });
      toast({ title: "Máquina eliminada" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!selectedOrg) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">Selecciona una organización para ver las máquinas.</p>
      </div>
    );
  }

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Máquinas</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Máquinas
        </h1>
        <Button onClick={() => setLocation("/machines/new")} data-testid="button-add-machine">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Máquina
        </Button>
      </div>

      <MachinesTable
        machines={machineList}
        onRowClick={(machineId: string) => setLocation(`/machines/${machineId}`)}
        onDelete={(machineId: string) => deleteMachine.mutate(machineId)}
      />
    </div>
  );
}
