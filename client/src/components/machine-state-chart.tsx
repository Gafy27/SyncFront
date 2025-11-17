interface StateSegment {
  start: number;
  end: number;
  state: string;
  color: string;
}

interface MachineStateChartProps {
  className?: string;
}

export function MachineStateChart({ className }: MachineStateChartProps) {
  const timeLabels = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30"];
  
  const stateSegments: StateSegment[] = [
    { start: 0, end: 8, state: "PREPARACIÓN", color: "#FDE047" },
    { start: 8, end: 15, state: "MD/M1", color: "#FDE047" },
    { start: 15, end: 18, state: "NECESIDADES PERSONALES", color: "#F87171" },
    { start: 18, end: 32, state: "MECANIZADO", color: "#4ADE80" },
    { start: 32, end: 35, state: "PREPARACIÓN", color: "#FDE047" },
    { start: 35, end: 48, state: "MECANIZADO", color: "#4ADE80" },
    { start: 48, end: 51, state: "NECESIDADES PERSONALES", color: "#F87171" },
    { start: 51, end: 62, state: "MECANIZADO", color: "#4ADE80" },
    { start: 62, end: 68, state: "PREPARACIÓN", color: "#FDE047" },
    { start: 68, end: 80, state: "MECANIZADO", color: "#4ADE80" },
    { start: 80, end: 85, state: "MD/M1", color: "#FDE047" },
    { start: 85, end: 95, state: "MECANIZADO", color: "#4ADE80" },
    { start: 95, end: 100, state: "PREPARACIÓN", color: "#FDE047" },
  ];

  return (
    <div className={className}>
      <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            {timeLabels.map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">PREPARACIÓN</div>
              <div className="relative h-8 bg-muted/30 rounded-sm overflow-hidden">
                <div className="absolute inset-0 flex">
                  {stateSegments
                    .filter(s => s.state === "PREPARACIÓN")
                    .map((segment, idx) => (
                      <div
                        key={idx}
                        className="absolute h-full"
                        style={{
                          left: `${segment.start}%`,
                          width: `${segment.end - segment.start}%`,
                          backgroundColor: segment.color,
                        }}
                      />
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">MD/M1</div>
              <div className="relative h-8 bg-muted/30 rounded-sm overflow-hidden">
                <div className="absolute inset-0 flex">
                  {stateSegments
                    .filter(s => s.state === "MD/M1")
                    .map((segment, idx) => (
                      <div
                        key={idx}
                        className="absolute h-full"
                        style={{
                          left: `${segment.start}%`,
                          width: `${segment.end - segment.start}%`,
                          backgroundColor: segment.color,
                        }}
                      />
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">NECESIDADES PERSONALES</div>
              <div className="relative h-8 bg-muted/30 rounded-sm overflow-hidden">
                <div className="absolute inset-0 flex">
                  {stateSegments
                    .filter(s => s.state === "NECESIDADES PERSONALES")
                    .map((segment, idx) => (
                      <div
                        key={idx}
                        className="absolute h-full"
                        style={{
                          left: `${segment.start}%`,
                          width: `${segment.end - segment.start}%`,
                          backgroundColor: segment.color,
                        }}
                      />
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">MECANIZADO</div>
              <div className="relative h-8 bg-muted/30 rounded-sm overflow-hidden">
                <div className="absolute inset-0 flex">
                  {stateSegments
                    .filter(s => s.state === "MECANIZADO")
                    .map((segment, idx) => (
                      <div
                        key={idx}
                        className="absolute h-full"
                        style={{
                          left: `${segment.start}%`,
                          width: `${segment.end - segment.start}%`,
                          backgroundColor: segment.color,
                        }}
                      />
                    ))}
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
