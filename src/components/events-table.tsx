import { Card, CardContent } from "@/components/ui/card";
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
    <Card data-testid="card-events-table">
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase">Evento</TableHead>
                <TableHead className="text-xs font-medium uppercase">Tipo</TableHead>
                <TableHead className="text-xs font-medium uppercase">Rango / Valores</TableHead>
                <TableHead className="text-xs font-medium uppercase">Flags</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay eventos registrados
                  </TableCell>
                </TableRow>
              ) : (
                events.map((ev) => (
                  <TableRow
                    key={ev.id ?? ev.event}
                    data-testid={`row-event-${ev.event}`}
                    className={onRowClick ? "hover-elevate cursor-pointer" : ""}
                    onClick={() => onRowClick && ev.id && onRowClick(ev.id)}
                  >
                    <TableCell className="text-sm font-medium font-mono">
                      {ev.event}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ev.type
                        ? <Badge variant="outline">{ev.type}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ev.values_range && ev.values_range.length === 2 ? (
                        <span className="font-mono">{ev.values_range[0]} – {ev.values_range[1]}</span>
                      ) : ev.auth_values && ev.auth_values.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ev.auth_values.map((v) => (
                            <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-wrap gap-1">
                        {ev.authenticate && <Badge variant="secondary" className="text-xs">Auth</Badge>}
                        {ev.is_counter && <Badge variant="secondary" className="text-xs">Counter</Badge>}
                        {ev.remove_duplicates && <Badge variant="secondary" className="text-xs">No dupes</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!confirm(`¿Eliminar evento "${ev.event}"?`)) return;
                          onDelete(ev.id ?? ev.event);
                        }}
                        data-testid={`button-delete-event-${ev.event}`}
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
      </CardContent>
    </Card>
  );
}
