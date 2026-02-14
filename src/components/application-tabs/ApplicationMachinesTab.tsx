import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MachinesTable } from "@/components/machines-table";

interface ApplicationMachinesTabProps {
  machines: any[];
  isLoading: boolean;
  selectedApp: string | null;
  onNewMachine: () => void;
  onRowClick: (id: string) => void;
}

export function ApplicationMachinesTab({
  machines,
  isLoading,
  onNewMachine,
  onRowClick,
}: ApplicationMachinesTabProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Máquinas</h2>
        <Button onClick={onNewMachine} data-testid="button-add-machine">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Máquina
        </Button>
      </div>
      <div className="mt-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando máquinas...
          </div>
        ) : (
          <MachinesTable
            machines={machines}
            onRowClick={onRowClick}
          />
        )}
      </div>
    </>
  );
}

