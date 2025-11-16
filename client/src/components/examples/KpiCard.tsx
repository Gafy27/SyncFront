import { KpiCard } from "../kpi-card";
import { Cpu, Radio, Activity, Package } from "lucide-react";

export default function KpiCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
      <KpiCard 
        title="Dispositivos Activos" 
        value={128} 
        icon={Cpu} 
        iconColor="text-green-600"
        testId="card-devices-active"
      />
      <KpiCard 
        title="Gateways Conectados" 
        value={14} 
        icon={Radio} 
        iconColor="text-blue-600"
        testId="card-gateways-connected"
      />
      <KpiCard 
        title="Eventos (Última hora)" 
        value="12,532" 
        icon={Activity} 
        iconColor="text-purple-600"
        testId="card-events-hour"
      />
      <KpiCard 
        title="Promedio por dispositivo" 
        value={485} 
        icon={Package} 
        iconColor="text-orange-600"
        testId="card-avg-device"
      />
    </div>
  );
}
