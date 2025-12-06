import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface Machine {
    machineId?: string;
    eui?: string;
    name?: string;
    status?: string;
    properties?: {
        status?: string;
        [key: string]: any;
    };
    events?: any[];
    connectors?: string[];
}

interface MachinesTableProps {
    machines: Machine[];
    onRowClick: (machineId: string) => void;
}

function MachineRow({ machine, onRowClick }: { machine: Machine; onRowClick: (id: string) => void }) {
    const id = machine.machineId || machine.eui || "";

    const statusPath = useMemo(() => {
        if (!id) return null;
        // Assuming the ID used for status is the EUI or machineId. 
        // The user snippet used `eui`. If `machine.eui` is present, use it.
        return `/device/${machine.eui || id}/status`;
    }, [id, machine.eui]);

    const { data: statusData } = useQuery<any>({
        queryKey: statusPath ? [statusPath] : ['status-disabled'],
        enabled: !!statusPath,
    });

    // Fetch events for last seen
    const eventsPath = useMemo(() => {
        if (!id) return null;
        return `/device/${machine.eui || id}/events`;
    }, [id, machine.eui]);

    const { data: eventsData = [] } = useQuery<any[]>({
        queryKey: eventsPath ? [eventsPath] : ['events-disabled'],
        enabled: !!eventsPath,
    });

    // Determine status:
    // 1. Real-time status from API (statusData.power) - only trust if explicitly true/false
    // 2. Fallback to machine properties only if statusData doesn't exist
    // 3. Default to "DESCONECTADA" if unknown

    let displayStatus = "DESCONECTADA";
    let isOffline = true;

    // Only trust statusData.power if it's explicitly true or false
    // If statusData exists but power is undefined/null, default to DESCONECTADA
    if (statusData && typeof statusData.power === 'boolean') {
        if (statusData.power === true) {
            displayStatus = "CONECTADA";
            isOffline = false;
        } else {
            displayStatus = "DESCONECTADA";
            isOffline = true;
        }
    } else if (statusData === null || statusData === undefined) {
        // Only use machine properties as fallback if statusData doesn't exist at all
        if (machine.properties?.status === "CONECTADA") {
            displayStatus = "CONECTADA";
            isOffline = false;
        } else {
            displayStatus = "DESCONECTADA";
            isOffline = true;
        }
    } else {
        // statusData exists but power is not a boolean - default to disconnected
        displayStatus = "DESCONECTADA";
        isOffline = true;
    }

    // Format last seen from events
    let lastSeen = '-';
    if (eventsData && eventsData.length > 0) {
        const latestEvent = eventsData[0]; // Events are ordered by time DESC
        if (latestEvent.time) {
            try {
                const timeValue = typeof latestEvent.time === 'number' ? latestEvent.time : Number(latestEvent.time);
                let timeMs: number;

                // Determine the format based on the magnitude
                if (timeValue > 1e18) {
                    timeMs = timeValue / 1000000; // nanoseconds to milliseconds
                } else if (timeValue > 1e15) {
                    timeMs = timeValue / 1000; // microseconds to milliseconds
                } else {
                    timeMs = timeValue; // already in milliseconds
                }

                const date = new Date(timeMs);
                lastSeen = date.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            } catch (e) {
                console.error('Error parsing event timestamp:', e);
            }
        }
    }

    return (
        <TableRow
            className="hover-elevate cursor-pointer"
            onClick={() => onRowClick(id)}
            data-testid={`row-machine-${id}`}
        >
            <TableCell className="text-sm font-medium">
                {machine.name || 'Sin nombre'}
            </TableCell>
            <TableCell className="text-sm">
                <Badge
                    variant="default"
                    className={
                        isOffline
                            ? "bg-red-100 text-red-700 border-red-200"
                            : "bg-green-100 text-green-700 border-green-200"
                    }
                >
                    {displayStatus}
                </Badge>
            </TableCell>
            <TableCell className="text-sm font-mono text-muted-foreground">
                {lastSeen}
            </TableCell>
            <TableCell className="text-sm">
                <div className="flex flex-wrap gap-1">
                    {machine.connectors?.map((conn, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                            {conn}
                        </Badge>
                    ))}
                </div>
            </TableCell>
        </TableRow>
    );
}

export function MachinesTable({ machines, onRowClick }: MachinesTableProps) {
    return (
        <Card data-testid="card-machines-table">
            <CardHeader>
                <CardTitle className="text-xl font-semibold">Máquinas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs font-medium uppercase">Nombre</TableHead>
                                <TableHead className="text-xs font-medium uppercase">Estado</TableHead>
                                <TableHead className="text-xs font-medium uppercase">Última Vez Visto</TableHead>
                                <TableHead className="text-xs font-medium uppercase">Conectores</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {machines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        No hay máquinas registradas
                                    </TableCell>
                                </TableRow>
                            ) : (
                                machines.map((machine) => {
                                    const id = machine.machineId || machine.eui || "";
                                    return (
                                        <MachineRow
                                            key={id}
                                            machine={machine}
                                            onRowClick={onRowClick}
                                        />
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
