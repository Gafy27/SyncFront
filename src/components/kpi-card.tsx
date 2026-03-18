import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  testId?: string;
}

export function KpiCard({ title, value, icon: Icon, testId }: KpiCardProps) {
  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-border/50 bg-card px-5 py-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{title}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid={`${testId}-value`}>
        {value}
      </p>
    </div>
  );
}
