import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  testId?: string;
}

export function KpiCard({ title, value, icon: Icon, iconColor = "text-primary", testId }: KpiCardProps) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <p className="text-4xl font-semibold" data-testid={`${testId}-value`}>{value}</p>
      </CardContent>
    </Card>
  );
}
