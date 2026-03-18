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
                  <TableCell colSpan={5} className="text-center py-8">
                    No hay eventos registrados
                  </TableCell>
                </TableRow>
              ) : (
                events.map((ev) => (
                  <TableRow
                    key={ev.id || ev.event}
                    className={onRowClick ? "cursor-pointer" : ""}
                    onClick={() => onRowClick && ev.id && onRowClick(ev.id)}
                  >
                    <TableCell className="font-medium">{ev.event}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {ev.type || "FLOAT"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ev.values_range && ev.values_range.length === 2 ? (
                        <span className="text-xs text-muted-foreground">
                          {ev.values_range[0]} – {ev.values_range[1]}
                        </span>
                      ) : ev.auth_values && ev.auth_values.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ev.auth_values.map((v) => (
                            <Badge key={v} variant="secondary" className="text-[10px]">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {ev.authenticate && (
                          <Badge variant="outline" className="text-[9px] bg-blue-50">AUTH</Badge>
                        )}
                        {ev.is_counter && (
                          <Badge variant="outline" className="text-[9px] bg-purple-50">COUNT</Badge>
                        )}
                        {ev.remove_duplicates && (
                          <Badge variant="outline" className="text-[9px] bg-orange-50">UNIQUE</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!confirm(`¿Eliminar evento "${ev.event}"?`)) return;
                          onDelete(ev.id || ev.event);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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

