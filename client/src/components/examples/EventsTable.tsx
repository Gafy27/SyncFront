import { EventsTable } from "../events-table";

const mockEvents = [
  {
    id: "1",
    timestamp: "13:42:01",
    deviceId: "CNC003",
    type: "uplink",
    payload: "36B",
    gatewayId: "GATE-12",
  },
  {
    id: "2",
    timestamp: "13:41:54",
    deviceId: "CNC005",
    type: "uplink",
    payload: "28B",
    gatewayId: "GATE-09",
  },
  {
    id: "3",
    timestamp: "13:41:50",
    deviceId: "NODE-8821",
    type: "status",
    payload: "—",
    gatewayId: "GATE-07",
  },
];

export default function EventsTableExample() {
  return (
    <div className="p-6">
      <EventsTable events={mockEvents} />
    </div>
  );
}
