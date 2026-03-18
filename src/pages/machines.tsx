import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { machines as machinesApi } from "@/lib/api";
import type { Machine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Cpu } from "lucide-react";
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
    <div className="flex flex-col h-full bg-background">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Máquinas</span>
        </div>
        <Button
          size="sm"
          onClick={() => setLocation("/machines/new")}
          data-testid="button-add-machine"
          className="h-8 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Nueva Máquina
        </Button>
      </div>

      {/* Table */}
      <div className="px-6 pt-4">
        <MachinesTable
          machines={machineList}
          onRowClick={(machineId: string) => setLocation(`/machines/${machineId}`)}
          onDelete={(machineId: string) => deleteMachine.mutate(machineId)}
        />
      </div>
    </div>
  );
}
