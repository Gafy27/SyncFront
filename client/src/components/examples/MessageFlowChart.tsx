import { MessageFlowChart } from "../message-flow-chart";

const mockData = [
  { time: "00:00", messages: 450 },
  { time: "04:00", messages: 320 },
  { time: "08:00", messages: 680 },
  { time: "12:00", messages: 920 },
  { time: "16:00", messages: 1100 },
  { time: "20:00", messages: 850 },
  { time: "24:00", messages: 520 },
];

export default function MessageFlowChartExample() {
  return (
    <div className="p-6">
      <MessageFlowChart data={mockData} />
    </div>
  );
}
