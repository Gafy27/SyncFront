import { StatusBadge } from "../status-badge";

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-4 p-6">
      <StatusBadge status="connected" testId="badge-connected" />
      <StatusBadge status="disconnected" testId="badge-disconnected" />
      <StatusBadge status="active" testId="badge-active" />
      <StatusBadge status="inactive" testId="badge-inactive" />
      <StatusBadge status="warning" testId="badge-warning" />
      <StatusBadge status="processing" testId="badge-processing" />
    </div>
  );
}
