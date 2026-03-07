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
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Machine {
    id?: string;
    machineId?: string;
    name?: string;
    status?: string;
    properties?: {
        status?: string;
        [key: string]: any;
    };
    connectors?: string[];
    updatedAt?: string;
}

interface MachinesTableProps {
    machines: Machine[];
    onRowClick: (machineId: string) => void;
    onDelete?: (machineId: string) => void;
}

export function MachinesTable({ machines, onRowClick, onDelete }: MachinesTableProps) {
    return (
        <Card data-testid="card-machines-table">
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs font-medium uppercase">Nombre</TableHead>
                                <TableHead className="text-xs font-medium uppercase">Estado</TableHead>
                                <TableHead className="text-xs font-medium uppercase">Última Actualización</TableHead>
                                <TableHead />
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
                                    const id = machine.id || machine.machineId || "";
                                    const status = machine.properties?.status || machine.status || "DESCONECTADA";
                                    const isOffline = status !== "CONECTADA";
                                    
                                    const lastUpdated = machine.updatedAt 
                                        ? new Date(machine.updatedAt).toLocaleString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        })
                                        : '-';

                                    return (
                                        <TableRow
                                            key={id}
                                            className="hover-elevate cursor-pointer group"
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
                                                    {status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-mono text-muted-foreground">
                                                {lastUpdated}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {onDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!confirm(`¿Eliminar máquina "${machine.name}"?`)) return;
                                                            onDelete(id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
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
