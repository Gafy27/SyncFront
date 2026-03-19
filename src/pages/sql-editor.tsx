import { useState, useRef } from "react";
import { Play, Loader2, AlertCircle, Download, Save, Database as DatabaseIcon, Cable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SqlEditor } from "@/components/SqlEditor";
import { executeQuery, metadata as metadataApi, bridges as bridgesApi } from "@/lib/api";
import { useOrganization } from "@/providers/organization-provider";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { toast } = useToast();
  const [query, setQuery] = useState("SELECT * FROM ");
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<number | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const startRef = useRef<number>(0);

  // SQL Bridge selection (Org-scoped)
  const [selectedBridge, setSelectedBridge] = useState<string>("");
  const { data: orgBridges, isLoading: bridgesLoading } = useQuery({
    queryKey: ["organizations", selectedOrg, "bridges"],
    queryFn: () => bridgesApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  // Filter only SQL-capable bridges
  const sqlBridges = (orgBridges?.items ?? []).filter(b =>
    ["postgresql", "timescaledb", "supabase"].includes(b.type?.toLowerCase() || "")
  );

  // Set default bridge if none selected
  if (!selectedBridge && sqlBridges.length > 0) {
    setSelectedBridge(sqlBridges[0].id);
  }

  // Metadata Save States
  const [isDataToMetadataOpen, setIsDataToMetadataOpen] = useState(false);
  const [selectedMetaTable, setSelectedMetaTable] = useState<string>("");
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  const { data: metaTables } = useQuery({
    queryKey: ["metadata", selectedOrg, "tables"],
    queryFn: () => metadataApi.listTables(selectedOrg!),
    enabled: !!selectedOrg && isDataToMetadataOpen,
  });

  const handleSaveToMetadata = async () => {
    if (!selectedMetaTable || rows.length === 0 || !selectedOrg) return;
    setIsSavingMeta(true);
    try {
      const records = rows.map(r => ({ data: r }));
      await metadataApi.bulkCreateRecords(selectedOrg, selectedMetaTable, records);
      toast({
        title: "Éxito",
        description: `${rows.length} registros guardados en la tabla ${selectedMetaTable}`,
      });
      setIsDataToMetadataOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Fallo al guardar metadatos",
        variant: "destructive",
      });
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleRun = async () => {
    if (!query.trim() || !selectedOrg) return;
    setIsLoading(true);
    setError(null);
    setHasRun(true);
    startRef.current = performance.now();

    try {
      const result = await executeQuery(
        query,
        selectedOrg,
        selectedBridge || undefined
      );
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
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/50 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 mr-2 border-r pr-4 border-border/50 shrink-0">
          <DatabaseIcon className="h-4 w-4 text-muted-foreground mr-1" />
          <Select onValueChange={setSelectedBridge} value={selectedBridge}>
            <SelectTrigger className="w-[200px] h-8 text-xs font-semibold bg-background">
              <SelectValue placeholder="Seleccionar origen..." />
            </SelectTrigger>
            <SelectContent>
              {bridgesLoading ? (
                <div className="p-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Cargando puentes...
                </div>
              ) : sqlBridges.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">
                  No se hallaron fuentes SQL
                </div>
              ) : (
                sqlBridges.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Cable className="h-3 w-3 text-muted-foreground/60" />
                      <span>{b.name}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => setIsDataToMetadataOpen(true)}
              >
                <Save className="h-3 w-3" />
                Guardar en Metadatos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={() => downloadCsv(columns, rows)}
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
            </div>
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

      <Dialog open={isDataToMetadataOpen} onOpenChange={setIsDataToMetadataOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Guardar en Metadatos</DialogTitle>
            <DialogDescription>
              Seleccione la tabla de destino para guardar los {rows.length} resultados de la consulta.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedMetaTable} value={selectedMetaTable}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tabla de metadatos" />
              </SelectTrigger>
              <SelectContent>
                {metaTables?.items.map((table) => (
                  <SelectItem key={table.name} value={table.name}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDataToMetadataOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveToMetadata}
              disabled={!selectedMetaTable || isSavingMeta}
            >
              {isSavingMeta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar {rows.length} registros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
