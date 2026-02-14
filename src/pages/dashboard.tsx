import { Building2, Boxes, Radio, Plug } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { executeSql } from "@/lib/api";
import { ApplicationsTable } from "@/components/applications-table";

export default function Dashboard() {
  const { selectedOrg, organizations } = useOrganization();

  // KPI: total organizations for this user
  const orgCount = organizations.length;

  // KPI: applications count (via SQL)
  const { data: appsCount = 0, isLoading: loadingApps } = useQuery({
    queryKey: ["dashboard-apps-count", selectedOrg],
    queryFn: async () => {
      const rows = await executeSql<{ count: number }>(
        "SELECT COUNT(*) as count FROM applications"
      );
      return Number(rows[0]?.count ?? 0);
    },
    enabled: !!selectedOrg,
  });

  // KPI: machines count (via SQL)
  const { data: machinesCount = 0, isLoading: loadingMachines } = useQuery({
    queryKey: ["dashboard-machines-count", selectedOrg],
    queryFn: async () => {
      const rows = await executeSql<{ count: number }>(
        "SELECT COUNT(*) as count FROM machines"
      );
      return Number(rows[0]?.count ?? 0);
    },
    enabled: !!selectedOrg,
  });

  // KPI: gateways count (via SQL)
  const { data: gatewaysCount = 0, isLoading: loadingGateways } = useQuery({
    queryKey: ["dashboard-gateways-count", selectedOrg],
    queryFn: async () => {
      const rows = await executeSql<{ count: number }>(
        "SELECT COUNT(*) as count FROM gateways"
      );
      return Number(rows[0]?.count ?? 0);
    },
    enabled: !!selectedOrg,
  });

  // KPI: connectors count (via SQL)
  const { data: connectorsCount = 0, isLoading: loadingConnectors } = useQuery(
    {
      queryKey: ["dashboard-connectors-count", selectedOrg],
      queryFn: async () => {
        const rows = await executeSql<{ count: number }>(
          "SELECT COUNT(*) as count FROM connectors"
        );
        return Number(rows[0]?.count ?? 0);
      },
      enabled: !!selectedOrg,
    }
  );

  // Fetch applications list for the table
  const { data: applications = [], isLoading: loadingAppsList } = useQuery({
    queryKey: ["dashboard-apps-list", selectedOrg],
    queryFn: () =>
      executeSql(
        "SELECT id, name, slug, status, created_at FROM applications ORDER BY created_at DESC LIMIT 10"
      ),
    enabled: !!selectedOrg,
  });

  const fmt = (v: number) => v.toLocaleString("en-US");

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Dashboard General</span>
      </div>

      <h1
        className="text-3xl font-semibold mb-8"
        data-testid="text-page-title"
      >
        Vista General
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <KpiCard
          title="Organizaciones"
          value={fmt(orgCount)}
          icon={Building2}
          iconColor="text-green-600"
          testId="card-orgs"
        />
        <KpiCard
          title="Aplicaciones"
          value={loadingApps ? "..." : fmt(appsCount)}
          icon={Boxes}
          iconColor="text-blue-600"
          testId="card-apps"
        />
        <KpiCard
          title="Maquinas"
          value={loadingMachines ? "..." : fmt(machinesCount)}
          icon={Radio}
          iconColor="text-purple-600"
          testId="card-machines"
        />
        <KpiCard
          title="Gateways"
          value={loadingGateways ? "..." : fmt(gatewaysCount)}
          icon={Radio}
          iconColor="text-orange-600"
          testId="card-gateways"
        />
      </div>

      <div className="mb-10">
        <ApplicationsTable
          applications={loadingAppsList ? [] : (applications as any[])}
        />
      </div>
    </div>
  );
}
