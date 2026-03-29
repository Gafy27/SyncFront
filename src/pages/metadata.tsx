import { useState } from "react";
import {
    Database,
    Plus,
    Search,
    Trash2,
    MoreVertical,
    Table as TableIcon,
    LayoutGrid,
    Edit2,
    PlusCircle,
    X,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { metadata as metadataApi } from "@/lib/api";
import { MetadataTable, MetadataRecord, MetadataColumn, MetadataColumnType } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const COLUMN_TYPES: MetadataColumnType[] = ["TEXT", "INTEGER", "FLOAT", "BOOLEAN", "TIMESTAMP"];

function formatCellValue(val: unknown, type: MetadataColumnType): string {
    if (val === null || val === undefined) return "—";
    if (type === "BOOLEAN") return val ? "true" : "false";
    if (type === "TIMESTAMP" && typeof val === "string") {
        try { return new Date(val).toLocaleString(); } catch { return String(val); }
    }
    return String(val);
}

// ─── Record Editor Dialog ────────────────────────────────────────────────────

function RecordEditorDialog({
    open,
    onOpenChange,
    table,
    record,
    onSave,
    isPending,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    table: MetadataTable;
    record?: MetadataRecord;
    onSave: (data: Record<string, any>) => void;
    isPending: boolean;
}) {
    const initialValues = () => {
        const defaults: Record<string, string> = {};
        for (const col of table.columns) {
            defaults[col.name] = record ? String(record.data[col.name] ?? "") : "";
        }
        return defaults;
    };
    const [values, setValues] = useState<Record<string, string>>(initialValues);

    const handleSave = () => {
        const data: Record<string, any> = {};
        for (const col of table.columns) {
            const raw = values[col.name];
            if (raw === "" || raw === undefined) {
                data[col.name] = null;
            } else if (col.type === "INTEGER") {
                data[col.name] = parseInt(raw, 10);
            } else if (col.type === "FLOAT") {
                data[col.name] = parseFloat(raw);
            } else if (col.type === "BOOLEAN") {
                data[col.name] = raw === "true";
            } else {
                data[col.name] = raw;
            }
        }
        onSave(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{record ? "Editar Registro" : "Nuevo Registro"}</DialogTitle>
                    <DialogDescription>
                        Rellene los campos de la tabla <span className="font-mono font-semibold">{table.name}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
                    {table.columns.map((col) => (
                        <div key={col.name} className="grid grid-cols-3 items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs font-mono truncate">{col.name}</Label>
                                <Badge variant="outline" className="text-[9px] px-1 h-4 font-mono shrink-0">{col.type}</Badge>
                            </div>
                            {col.type === "BOOLEAN" ? (
                                <Select
                                    value={values[col.name] ?? ""}
                                    onValueChange={(v) => setValues({ ...values, [col.name]: v })}
                                >
                                    <SelectTrigger className="col-span-2 h-8 text-xs">
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">true</SelectItem>
                                        <SelectItem value="false">false</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    className="col-span-2 h-8 text-xs font-mono"
                                    placeholder={col.nullable ? "null" : `${col.type.toLowerCase()}...`}
                                    type={col.type === "INTEGER" || col.type === "FLOAT" ? "number" : "text"}
                                    value={values[col.name] ?? ""}
                                    onChange={(e) => setValues({ ...values, [col.name]: e.target.value })}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isPending}>Guardar Registro</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Create Table Dialog ─────────────────────────────────────────────────────

function CreateTableDialog({
    open,
    onOpenChange,
    onSave,
    isPending,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: { name: string; description?: string; columns: MetadataColumn[] }) => void;
    isPending: boolean;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [columns, setColumns] = useState<MetadataColumn[]>([
        { name: "", type: "TEXT", nullable: true },
    ]);

    const addColumn = () => setColumns([...columns, { name: "", type: "TEXT", nullable: true }]);
    const removeColumn = (i: number) => setColumns(columns.filter((_, idx) => idx !== i));
    const updateColumn = (i: number, patch: Partial<MetadataColumn>) => {
        const next = [...columns];
        next[i] = { ...next[i], ...patch };
        setColumns(next);
    };

    const handleSave = () => {
        onSave({ name, description: description || undefined, columns });
    };

    const valid = name.trim() && columns.length > 0 && columns.every(c => c.name.trim());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Crear Tabla de Metadatos</DialogTitle>
                    <DialogDescription>
                        Defina el nombre y el esquema de columnas de la tabla.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="tname" className="text-xs">Nombre <span className="text-destructive">*</span></Label>
                            <Input id="tname" placeholder="ej: machine_props" className="font-mono text-sm h-8"
                                value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="tdesc" className="text-xs">Descripción</Label>
                            <Input id="tdesc" placeholder="Opcional" className="text-sm h-8"
                                value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Columnas</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addColumn}>
                                <PlusCircle className="h-3 w-3" /> Añadir columna
                            </Button>
                        </div>

                        <div className="border rounded-md overflow-hidden">
                            <div className="grid grid-cols-12 gap-0 bg-muted/40 px-3 py-1.5 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground border-b">
                                <div className="col-span-5">Nombre</div>
                                <div className="col-span-4">Tipo</div>
                                <div className="col-span-2">Nullable</div>
                                <div className="col-span-1"></div>
                            </div>
                            <div className="max-h-48 overflow-y-auto divide-y">
                                {columns.map((col, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                                        <div className="col-span-5">
                                            <Input
                                                placeholder="col_name"
                                                className="h-7 text-xs font-mono"
                                                value={col.name}
                                                onChange={(e) => updateColumn(i, { name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <Select value={col.type} onValueChange={(v) => updateColumn(i, { type: v as MetadataColumnType })}>
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COLUMN_TYPES.map(t => (
                                                        <SelectItem key={t} value={t} className="text-xs font-mono">{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={col.nullable}
                                                onChange={(e) => updateColumn(i, { nullable: e.target.checked })}
                                                className="h-4 w-4 accent-primary"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeColumn(i)}
                                                disabled={columns.length === 1}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!valid || isPending}>Crear Tabla</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MetadataPage() {
    const { selectedOrg } = useOrganization();
    const { toast } = useToast();
    const [selectedTable, setSelectedTable] = useState<MetadataTable | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
    const [isRecordEditorOpen, setIsRecordEditorOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MetadataRecord | undefined>(undefined);
    const [deletingTableName, setDeletingTableName] = useState<string | null>(null);

    const orgId = selectedOrg || "";

    const { data: tableData, isLoading: tablesLoading } = useQuery({
        queryKey: ["metadata", orgId, "tables"],
        queryFn: () => metadataApi.listTables(orgId),
        enabled: !!orgId,
    });

    const { data: recordData, isLoading: recordsLoading } = useQuery({
        queryKey: ["metadata", orgId, "records", selectedTable?.name],
        queryFn: () => metadataApi.listRecords(orgId, selectedTable!.name),
        enabled: !!orgId && !!selectedTable,
    });

    const createTableMutation = useMutation({
        mutationFn: (data: { name: string; description?: string; columns: MetadataColumn[] }) =>
            metadataApi.createTable(orgId, data),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ["metadata", orgId, "tables"] });
            setIsCreateTableOpen(false);
            setSelectedTable(created);
            toast({ title: "Éxito", description: "Tabla creada correctamente" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const deleteTableMutation = useMutation({
        mutationFn: (tableName: string) => metadataApi.deleteTable(orgId, tableName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["metadata", orgId, "tables"] });
            if (selectedTable?.name === deletingTableName) setSelectedTable(null);
            setDeletingTableName(null);
            toast({ title: "Éxito", description: "Tabla eliminada" });
        }
    });

    const saveRecordMutation = useMutation({
        mutationFn: (data: Record<string, any>) => {
            if (editingRecord) {
                return metadataApi.replaceRecord(orgId, selectedTable!.name, editingRecord.id, data);
            }
            return metadataApi.createRecord(orgId, selectedTable!.name, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["metadata", orgId, "records", selectedTable?.name] });
            setIsRecordEditorOpen(false);
            setEditingRecord(undefined);
            toast({ title: "Éxito", description: "Registro guardado" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const deleteRecordMutation = useMutation({
        mutationFn: (recordId: string) =>
            metadataApi.deleteRecord(orgId, selectedTable!.name, recordId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["metadata", orgId, "records", selectedTable?.name] });
            toast({ title: "Éxito", description: "Registro eliminado" });
        }
    });

    const filteredTables = tableData?.items.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Sync selectedTable with fresh data from tableData (columns may update)
    const freshSelectedTable = selectedTable
        ? (tableData?.items.find(t => t.name === selectedTable.name) ?? selectedTable)
        : null;

    if (!orgId) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Seleccione una organización para continuar</p>
            </div>
        );
    }

    const columns = freshSelectedTable?.columns ?? [];

    return (
        <div className="flex h-full bg-background overflow-hidden">
            {/* Left Column: Tables List */}
            <div className="w-80 border-r flex flex-col shrink-0">
                <div className="px-6 py-3 border-b border-border/40 flex items-center justify-between shrink-0 h-[53px]">
                    <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground/60">Tablas</span>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsCreateTableOpen(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <div className="p-3 bg-muted/20 border-b">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input
                            placeholder="Buscar tabla..."
                            className="pl-8 h-8 text-[13px] bg-background border-muted/60"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-0.5">
                        {tablesLoading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-12 bg-muted/20 animate-pulse rounded-md" />
                                ))}
                            </div>
                        ) : filteredTables.length === 0 ? (
                            <div className="p-10 text-center">
                                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-1">Vacío</p>
                                <p className="text-[13px] text-muted-foreground">No se hallaron tablas</p>
                            </div>
                        ) : (
                            filteredTables.map((table) => (
                                <button
                                    key={table.name}
                                    onClick={() => setSelectedTable(table)}
                                    className={`w-full group flex flex-col p-3 rounded-md text-left transition-all border border-transparent ${
                                        freshSelectedTable?.name === table.name
                                            ? "bg-muted/60 border-border/40 shadow-sm"
                                            : "hover:bg-muted/30 text-muted-foreground"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <TableIcon className={`h-3.5 w-3.5 shrink-0 ${freshSelectedTable?.name === table.name ? "text-primary" : "text-muted-foreground/60"}`} />
                                            <span className={`text-[13.5px] truncate font-semibold ${freshSelectedTable?.name === table.name ? "text-foreground" : ""}`}>
                                                {table.name}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono bg-background/50">
                                            {table.columns.length} cols
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/60 line-clamp-1 pl-5">
                                        {table.description || "Sin descripción"}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Column: Table Records */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {freshSelectedTable ? (
                    <>
                        {/* Header */}
                        <div className="px-8 py-3 bg-muted/10 border-b border-border/40 flex items-center justify-between shrink-0 h-[53px]">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <TableIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex items-baseline gap-2 overflow-hidden">
                                    <h3 className="text-[15px] font-bold text-foreground truncate">{freshSelectedTable.name}</h3>
                                    <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                                        ({recordData?.total ?? 0} registros)
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    className="h-8 text-xs px-3"
                                    onClick={() => { setEditingRecord(undefined); setIsRecordEditorOpen(true); }}
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Nuevo Registro
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[180px]">
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive text-xs"
                                            onClick={() => {
                                                if (confirm(`¿Eliminar tabla "${freshSelectedTable.name}"? Se perderán todos sus registros.`)) {
                                                    setDeletingTableName(freshSelectedTable.name);
                                                    deleteTableMutation.mutate(freshSelectedTable.name);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                                            Eliminar Tabla
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Records Table */}
                        <div className="flex-1 overflow-hidden">
                            {recordsLoading ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-50">
                                    <div className="h-6 w-6 border-2 border-primary/30 border-t-primary animate-spin rounded-full mb-2" />
                                    <span className="text-[11px] uppercase tracking-widest">Cargando...</span>
                                </div>
                            ) : !recordData || recordData.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                    <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                                        <LayoutGrid className="h-5 w-5 text-muted-foreground/30" />
                                    </div>
                                    <h4 className="text-[15px] font-semibold mb-1">Esta tabla no tiene registros</h4>
                                    <p className="text-[13px] text-muted-foreground max-w-xs mb-6">
                                        Cree el primer registro rellenando los campos del esquema.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-4 text-xs font-semibold border-dashed"
                                        onClick={() => { setEditingRecord(undefined); setIsRecordEditorOpen(true); }}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-2" />
                                        Crear Registro
                                    </Button>
                                </div>
                            ) : (
                                <div className="h-full overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                                            <TableRow>
                                                <TableHead className="w-10 text-right text-[10px] text-muted-foreground font-normal select-none px-3">
                                                    #
                                                </TableHead>
                                                {columns.map((col) => (
                                                    <TableHead key={col.name} className="text-xs font-semibold px-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            {col.name}
                                                            <Badge variant="outline" className="text-[9px] px-1 h-4 font-mono font-normal">{col.type}</Badge>
                                                        </div>
                                                    </TableHead>
                                                ))}
                                                <TableHead className="w-20 px-3" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recordData.items.map((record, i) => (
                                                <TableRow key={record.id} className="group">
                                                    <TableCell className="text-right text-xs text-muted-foreground select-none px-3 py-2">
                                                        {i + 1}
                                                    </TableCell>
                                                    {columns.map((col) => (
                                                        <TableCell key={col.name} className="px-3 py-2 font-mono text-xs max-w-[200px] truncate">
                                                            {formatCellValue(record.data[col.name], col.type)}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="px-3 py-2">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                                onClick={() => { setEditingRecord(record); setIsRecordEditorOpen(true); }}
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                onClick={() => {
                                                                    if (confirm("¿Eliminar este registro?")) {
                                                                        deleteRecordMutation.mutate(record.id);
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center opacity-80">
                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                            <Database className="h-10 w-10 text-primary/20" />
                        </div>
                        <h3 className="text-[18px] font-bold text-foreground">Gestión de Metadatos</h3>
                        <p className="text-[14px] text-muted-foreground max-w-sm mt-3 leading-relaxed">
                            Elija una organización y una tabla en el panel izquierdo para gestionar su información.
                        </p>
                        <Button
                            variant="secondary"
                            className="mt-8 h-10 px-6 text-xs font-semibold uppercase tracking-wider shadow-sm"
                            onClick={() => setIsCreateTableOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Nueva Tabla
                        </Button>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <CreateTableDialog
                open={isCreateTableOpen}
                onOpenChange={setIsCreateTableOpen}
                onSave={(data) => createTableMutation.mutate(data)}
                isPending={createTableMutation.isPending}
            />

            {isRecordEditorOpen && freshSelectedTable && (
                <RecordEditorDialog
                    open={isRecordEditorOpen}
                    onOpenChange={setIsRecordEditorOpen}
                    table={freshSelectedTable}
                    record={editingRecord}
                    onSave={(data) => saveRecordMutation.mutate(data)}
                    isPending={saveRecordMutation.isPending}
                />
            )}
        </div>
    );
}
