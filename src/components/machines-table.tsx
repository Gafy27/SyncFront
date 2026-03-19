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
    connectors?: (string | { template_id: string; config?: Record<string, unknown> })[];
    updated_at?: string;
    updatedAt?: string;
}

interface MachinesTableProps {
    machines: Machine[];
    onRowClick: (machineId: string) => void;
    onDelete?: (machineId: string) => void;
}

export function MachinesTable({ machines, onRowClick, onDelete }: MachinesTableProps) {
    return (
        <div className="overflow-x-auto" data-testid="card-machines-table">
            <Table className="border-none">
                <TableHeader className="[&_tr]:border-none">
                    <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Máquina</TableHead>
                        <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Estado</TableHead>
                        <TableHead className="h-8 text-right text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Actualizado</TableHead>
                        <TableHead className="w-10 h-8" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {machines.length === 0 ? (
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                                No hay máquinas registradas
                            </TableCell>
                        </TableRow>
                    ) : (
                        machines.map((machine) => {
                            const id = machine.id || machine.machineId || "";
                            const status = machine.properties?.status || machine.status || "DESCONECTADA";
                            const isOnline = status === "CONECTADA";
                            const rawDate = machine.updated_at || machine.updatedAt;
                            const lastUpdated = rawDate
                                ? new Date(rawDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                                : '—';
                            const connectorCount = machine.connectors?.length ?? 0;

                            return (
                                <TableRow
                                    key={id}
                                    className="group border-none hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => onRowClick(id)}
                                    data-testid={`row-machine-${id}`}
                                >

                                    <TableCell className="py-3 align-top">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[14px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                                                {machine.name || 'Sin nombre'}
                                            </span>
                                            <span className="text-[12px] text-muted-foreground">
                                                {connectorCount > 0 ? `${connectorCount} conector${connectorCount > 1 ? 'es' : ''}` : 'Sin conectores'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 align-top">
                                        <Badge
                                            variant="secondary"
                                            className={isOnline ? "bg-green-100 text-green-700 hover:bg-green-100 text-[12px]" : "text-[12px]"}
                                        >
                                            {status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-3 text-right text-[13px] text-muted-foreground align-top">
                                        {lastUpdated}
                                    </TableCell>
                                    <TableCell className="py-3 text-right align-top">
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
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
    );
}
