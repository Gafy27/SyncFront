import { useState, useRef } from "react";
import { Play, Loader2, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SqlEditor } from "@/components/SqlEditor";
import { executeQuery } from "@/lib/api";
import { useOrganization } from "@/providers/organization-provider";

type Row = Record<string, unknown>;

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function downloadCsv(columns: string[], rows: Row[]) {
  const header = columns.join(",");
  const body = rows
    .map((r) => columns.map((c) => `"${formatCellValue(r[c]).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "query_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function SqlEditorPage() {
  const { selectedOrg } = useOrganization();
  const [query, setQuery] = useState("SELECT * FROM ");
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<number | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const startRef = useRef<number>(0);

  const handleRun = async () => {
    if (!query.trim() || !selectedOrg) return;
    setIsLoading(true);
    setError(null);
    setHasRun(true);
    startRef.current = performance.now();

    try {
      const result = await executeQuery(query, selectedOrg);
      const elapsed = performance.now() - startRef.current;
      setRuntime(elapsed);
      if (result.length > 0) {
        setColumns(Object.keys(result[0]));
      } else {
        setColumns([]);
      }
      setRows(result);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Query failed";
      // Strip SQLAlchemy boilerplate — keep only the DB error line
      const match = raw.match(/\([\w.]+\)\s([\s\S]+?)(?:\nLINE|\n\n|\[SQL)/);
      setError(match ? match[1].trim() : raw);
      setRows([]);
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/50 shrink-0">
        <Button
          size="sm"
          onClick={handleRun}
          disabled={isLoading || !query.trim() || !selectedOrg}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          {isLoading ? "Running..." : "Run"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs">Ctrl+Enter</kbd> to run
        </span>
      </div>

      {/* Editor */}
      <div className="h-64 shrink-0 border-b border-border">
        <SqlEditor
          value={query}
          onChange={(val) => setQuery(val ?? "")}
        />
      </div>

      {/* Results pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Results tab bar */}
        <div className="flex items-center justify-between px-4 py-1 border-b border-border bg-card/30 shrink-0">
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 text-sm font-medium border-b-2 border-primary text-primary">
              Table
            </button>
          </div>
          {rows.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-7 text-xs"
              onClick={() => downloadCsv(columns, rows)}
            >
              <Download className="h-3 w-3" />
              CSV
            </Button>
          )}
        </div>

        {/* Results content */}
        <div className="flex-1 overflow-auto">
          {!hasRun && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Run a query to see results
            </div>
          )}

          {hasRun && isLoading && (
            <div className="h-full flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Executing query...</span>
            </div>
          )}

          {hasRun && !isLoading && error && (
            <div className="m-4 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <pre className="text-sm whitespace-pre-wrap font-mono">{error}</pre>
            </div>
          )}

          {hasRun && !isLoading && !error && rows.length === 0 && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Query returned no rows
            </div>
          )}

          {hasRun && !isLoading && !error && rows.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="w-10 px-3 py-2 text-right text-xs text-muted-foreground font-normal border-b border-r border-border/50 select-none">
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-semibold text-foreground border-b border-r border-border/50 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-muted/30 border-b border-border/30"
                  >
                    <td className="px-3 py-1.5 text-right text-xs text-muted-foreground border-r border-border/30 select-none">
                      {i + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-1.5 font-mono text-xs border-r border-border/30 max-w-xs truncate"
                        title={formatCellValue(row[col])}
                      >
                        {formatCellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Status bar */}
        {hasRun && !isLoading && !error && rows.length > 0 && (
          <div className="px-4 py-1.5 border-t border-border bg-card/30 shrink-0 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{rows.length.toLocaleString()} {rows.length === 1 ? "row" : "rows"}</span>
            {runtime !== null && (
              <span>{(runtime / 1000).toFixed(2)}s runtime</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
