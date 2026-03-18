import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
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
    connectors?: (string | { template_id: string; config?: Record<string, unknown> })[];
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
            <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs font-medium uppercase">ID</TableHead>
                                <TableHead className="text-xs font-medium uppercase">Nombre</TableHead>
                                <TableHead className="text-xs font-medium uppercase">Estado</TableHead>
                                <TableHead className="text-xs font-medium uppercase">Actualizado</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {machines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        No hay máquinas registradas
                                    </TableCell>
                                </TableRow>
                            ) : (
                                machines.map((machine) => {
                                    const id = machine.id || machine.machineId || "";
                                    const status = machine.properties?.status || machine.status || "DESCONECTADA";
                                    const isOnline = status === "CONECTADA";

                                    const lastUpdated = machine.updatedAt
                                        ? new Date(machine.updatedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                                        : '-';

                                    return (
                                        <TableRow
                                            key={id}
                                            className="cursor-pointer"
                                            onClick={() => onRowClick(id)}
                                            data-testid={`row-machine-${id}`}
                                        >
                                            <TableCell className="font-mono text-xs">{id.slice(0, 8)}</TableCell>
                                            <TableCell className="font-medium">{machine.name || 'Sin nombre'}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={isOnline ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                                                >
                                                    {status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{lastUpdated}</TableCell>
                                            <TableCell>
                                                {onDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!confirm(`¿Eliminar máquina "${machine.name}"?`)) return;
                                                            onDelete(id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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
