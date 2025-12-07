import { Cpu, Radio, Activity, AlertTriangle, Package } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { MessageFlowChart } from "@/components/message-flow-chart";
import { EventsTable } from "@/components/events-table";
import { ApplicationsTable } from "@/components/applications-table";
import { UsageStatistics } from "@/components/usage-statistics";
import { AlarmsTable } from "@/components/alarms-table";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";

// Removed mockEvents - now fetched from API

export default function Dashboard() {
  const { selectedOrg } = useOrganization();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  // Fetch registered devices count across all databases
  const { data: registeredDevices = { count: 0 }, isLoading: loadingRegistered } = useQuery<{ count: number }>({
    queryKey: ['/api/query/registered/all'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/registered/all`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Fetch applications registered count across all databases
  const { data: applicationsRegistered = { count: 0 }, isLoading: loadingApplicationsRegistered } = useQuery<{ count: number }>({
    queryKey: ['/api/query/apps-registered'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/apps-registered`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });
  // Fetch connected devices count
  const { data: connectedDevices = { count: 0 }, isLoading: loadingConnected } = useQuery<{ count: number }>({
    queryKey: ['/api/query/connected'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/connected`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Fetch events processed in last 24 hours
  const { data: events24h = { count: 0 }, isLoading: loadingEvents24h } = useQuery<{ count: number }>({
    queryKey: ['/api/query/events/processed-24h'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/events/processed-24h`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Fetch recent events
  const { data: apiEvents = [], isLoading: loadingEvents } = useQuery<any[]>({
    queryKey: ['/api/query/events'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/events`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Fetch all applications across all organizations
  const { data: applications = [], isLoading: loadingApplications } = useQuery<any[]>({
    queryKey: ['/api/query/applications'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/query/applications`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      return res.json();
    },
  });

  // Transform API events to match EventsTable format
  const transformedEvents = apiEvents.map((event, index) => {
    // Convert timestamp to Date and format
    // InfluxDB can return time in different formats (nanoseconds, microseconds, or milliseconds)
    let timestamp = 'N/A';
    if (event.time) {
      try {
        const timeValue = typeof event.time === 'number' ? event.time : Number(event.time);
        let timeMs: number;
        
        // Determine the format based on the magnitude
        // Current Unix timestamps (2024-2025) in milliseconds are ~1.7e12
        // Microseconds would be ~1.7e15, nanoseconds would be ~1.7e18
        // So: > 1e18 = nanoseconds, > 1e15 = microseconds, otherwise = milliseconds
        if (timeValue > 1e18) {
          timeMs = timeValue / 1000000; // nanoseconds to milliseconds
        } else if (timeValue > 1e15) {
          timeMs = timeValue / 1000; // microseconds to milliseconds
        } else {
          timeMs = timeValue; // already in milliseconds
        }
        
        const date = new Date(timeMs);
        // Format as full datetime: DD/MM/YYYY HH:MM:SS
        timestamp = date.toLocaleString('es-ES', { 
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false
        });
      } catch (e) {
        console.error('Error parsing timestamp:', e);
        timestamp = new Date().toLocaleString('es-ES', { 
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false
        });
      }
    }
    
    return {
      id: `${event.event_id || 'event'}-${index}-${event.time || Date.now()}`,
      timestamp,
      deviceId: event.machine_id || 'N/A',
      eventId: event.event_id || 'N/A',
      payload: event.event_value?.toString() || '—',
    };
  });

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Dashboard General</span>
      </div>

      <h1 className="text-3xl font-semibold mb-8" data-testid="text-page-title">
        Vista General
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <KpiCard 
          title="Dispositivos Registrados" 
          value={loadingRegistered ? "..." : formatNumber(registeredDevices.count)} 
          icon={Cpu} 
          iconColor="text-green-600"
          testId="card-devices-active"
        />
        <KpiCard 
          title="Dispositivos Conectados" 
          value={loadingConnected ? "..." : formatNumber(connectedDevices.count)} 
          icon={Radio} 
          iconColor="text-blue-600"
          testId="card-gateways-connected"
        />
        <KpiCard 
          title="Eventos (Últimas 24 horas)" 
          value={loadingEvents24h ? "..." : formatNumber(events24h.count)} 
          icon={Activity} 
          iconColor="text-purple-600"
          testId="card-events-hour"
        />
        <KpiCard 
          title="Aplicaciones Registradas" 
          value={loadingApplicationsRegistered ? "..." : formatNumber(applicationsRegistered.count)} 
          icon={Package} 
          iconColor="text-orange-600"
          testId="card-applications-registered"
        />
      </div>

      <div className="mb-10">
        <UsageStatistics />
      </div>

      <div className="mb-10">
        <ApplicationsTable applications={loadingApplications ? [] : applications} />
      </div>

      <div className="mb-10">
        <EventsTable events={loadingEvents ? [] : transformedEvents} />
      </div>

    </div>
  );
}
