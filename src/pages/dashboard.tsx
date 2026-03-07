import { Building2, Cable, Cpu, Zap, Workflow } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { machines as machinesApi, bridges as bridgesApi, events as eventsApi, workflows as workflowsApi, organizations as orgsApi } from "@/lib/api";

export default function Dashboard() {
  const { selectedOrg, organizations } = useOrganization();

  const orgCount = organizations.length;

  const { data: machineList = [] } = useQuery({
    queryKey: ["organizations", selectedOrg, "machines"],
    queryFn: () => machinesApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  const { data: bridgeList = [] } = useQuery({
    queryKey: ["organizations", selectedOrg, "bridges"],
    queryFn: () => bridgesApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  const { data: eventList = [] } = useQuery({
    queryKey: ["organizations", selectedOrg, "events"],
    queryFn: () => eventsApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  const { data: workflowList = [] } = useQuery({
    queryKey: ["organizations", selectedOrg, "workflows"],
    queryFn: () => workflowsApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  // const fmt = (v: number) => v.toLocaleString("en-US");
  const fmt = (v: number | undefined | null) =>
    typeof v === "number" ? v.toLocaleString("es-ES") : "-";
  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Dashboard General</span>
      </div>

      <h1 className="text-3xl font-semibold mb-8" data-testid="text-page-title">
        Vista General
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <KpiCard
          title="Organizaciones"
          value={fmt(orgCount)}
          icon={Building2}
          iconColor="text-green-600"
          testId="card-orgs"
        />
        <KpiCard
          title="Bridges"
          value={selectedOrg ? fmt(bridgeList.length) : "-"}
          icon={Cable}
          iconColor="text-blue-600"
          testId="card-bridges"
        />
        <KpiCard
          title="Máquinas"
          value={selectedOrg ? fmt(machineList.length) : "-"}
          icon={Cpu}
          iconColor="text-purple-600"
          testId="card-machines"
        />
        <KpiCard
          title="Eventos"
          value={selectedOrg ? fmt(eventList.length) : "-"}
          icon={Zap}
          iconColor="text-orange-600"
          testId="card-events"
        />
        <KpiCard
          title="Workflows"
          value={selectedOrg ? fmt(workflowList.length) : "-"}
          icon={Workflow}
          iconColor="text-indigo-600"
          testId="card-workflows"
        />
      </div>

      {!selectedOrg && (
        <p className="text-muted-foreground text-center py-12">
          Selecciona una organización para ver los datos.
        </p>
      )}
    </div>
  );
}
