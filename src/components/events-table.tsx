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
import type { OrgEvent } from "@/lib/types";

interface EventsTableProps {
  events: OrgEvent[];
  onDelete: (id: string) => void;
  onRowClick?: (id: string) => void;
}

export function EventsTable({ events, onDelete, onRowClick }: EventsTableProps) {
  return (
    <div className="overflow-x-auto" data-testid="card-events-table">
      <Table className="border-none">
        <TableHeader className="[&_tr]:border-none">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Evento</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Tipo</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Rango / Valores</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Flags</TableHead>
            <TableHead className="w-10 h-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow className="hover:bg-transparent border-none">
              <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                No hay eventos registrados
              </TableCell>
            </TableRow>
          ) : (
            events.map((ev) => (
              <TableRow
                key={ev.id || ev.event}
                className="group border-none hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onRowClick && ev.id && onRowClick(ev.id)}
              >
                <TableCell className="py-3 align-top">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {ev.event}
                    </span>
                    <span className="text-[12px] text-muted-foreground font-mono">
                      {ev.topic || '—'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 align-top">
                  <Badge variant="outline" className="text-[12px] font-mono">
                    {ev.type || "FLOAT"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 align-top">
                  {ev.values_range && ev.values_range.length === 2 ? (
                    <span className="text-[13px] text-muted-foreground">
                      {ev.values_range[0]} – {ev.values_range[1]}
                    </span>
                  ) : ev.auth_values && ev.auth_values.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {ev.auth_values.map((v) => (
                        <Badge key={v} variant="secondary" className="text-[11px]">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[13px] text-muted-foreground opacity-30">—</span>
                  )}
                </TableCell>
                <TableCell className="py-3 align-top">
                  <div className="flex gap-1">
                    {ev.authenticate && (
                      <Badge variant="outline" className="text-[11px] bg-blue-50 dark:bg-blue-950/30">AUTH</Badge>
                    )}
                    {ev.is_counter && (
                      <Badge variant="outline" className="text-[11px] bg-purple-50 dark:bg-purple-950/30">COUNT</Badge>
                    )}
                    {ev.remove_duplicates && (
                      <Badge variant="outline" className="text-[11px] bg-orange-50 dark:bg-orange-950/30">UNIQUE</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3 text-right align-top">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm(`¿Eliminar evento "${ev.event}"?`)) return;
                      onDelete(ev.id || ev.event);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
