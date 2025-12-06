import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Event {
  id: string;
  timestamp: string;
  deviceId: string;
  eventId: string;
  payload: string;
}

interface EventsTableProps {
  events: Event[];
}

const typeColors: Record<string, string> = {
  uplink: "text-blue-600",
  status: "text-green-600",
  downlink: "text-purple-600",
  error: "text-red-600",
};

export function EventsTable({ events }: EventsTableProps) {
  return (
    <Card data-testid="card-events-table">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Eventos recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase">Hora</TableHead>
                <TableHead className="text-xs font-medium uppercase">Dispositivo</TableHead>
                <TableHead className="text-xs font-medium uppercase">Event ID</TableHead>
                <TableHead className="text-xs font-medium uppercase">Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className="hover-elevate" data-testid={`row-event-${event.id}`}>
                  <TableCell className="text-sm font-mono">{event.timestamp}</TableCell>
                  <TableCell className="text-sm font-medium" data-testid={`text-device-${event.id}`}>
                    {event.deviceId}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{event.eventId}</TableCell>
                  <TableCell className="text-sm font-mono">{event.payload}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
