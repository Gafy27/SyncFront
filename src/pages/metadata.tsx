import { useState } from "react";
import {
    Database,
    Plus,
    Search,
    Trash2,
    MoreVertical,
    Table as TableIcon,
    LayoutGrid,
    List,
    Edit2,
    Save,
    X,
    PlusCircle
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { metadata as metadataApi } from "@/lib/api";
import { MetadataTable, MetadataRecord } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Sub-components ---

interface PropertyRow {
    key: string;
    value: any;
}

function RecordEditorDialog({
    open,
    onOpenChange,
    tableName,
    record,
    onSave
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tableName: string;
    record?: MetadataRecord;
    onSave: (data: Record<string, any>) => void;
}) {
    const [properties, setProperties] = useState<PropertyRow[]>(() => {
        if (record?.data) {
            return Object.entries(record.data).map(([key, value]) => ({ key, value }));
        }
        return [{ key: "", value: "" }];
    });

    const addProperty = () => {
        setProperties([...properties, { key: "", value: "" }]);
    };

    const removeProperty = (index: number) => {
        setProperties(properties.filter((_, i) => i !== index));
    };

    const updateProperty = (index: number, field: "key" | "value", val: any) => {
        const next = [...properties];
        next[index][field] = val;
        setProperties(next);
    };

    const handleSave = () => {
        const data: Record<string, any> = {};
        properties.forEach(p => {
            if (p.key.trim()) {
                data[p.key.trim()] = p.value;
            }
        });
        onSave(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{record ? "Editar Registro" : "Nuevo Registro"}</DialogTitle>
                    <DialogDescription>
                        Agregue o modifique las propiedades de este registro en {tableName}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                            <div className="col-span-5">Clave (ej: location)</div>
                            <div className="col-span-6">Valor (ej: Hall A)</div>
                            <div className="col-span-1"></div>
                        </div>

                        {properties.map((prop, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-5">
                                    <Input
                                        placeholder="Clave"
                                        value={prop.key}
                                        onChange={(e) => updateProperty(idx, "key", e.target.value)}
                                        className="h-9 text-sm font-mono"
                                    />
                                </div>
                                <div className="col-span-6">
                                    <Input
                                        placeholder="Valor"
                                        value={prop.value}
                                        onChange={(e) => updateProperty(idx, "value", e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeProperty(idx)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed"
                            onClick={addProperty}
                        >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Añadir Propiedad
                        </Button>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Registro</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Components ---

export default function MetadataPage() {
    const { selectedOrg } = useOrganization();
    const { toast } = useToast();
    const [selectedTable, setSelectedTable] = useState<MetadataTable | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog states
    const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
    const [isRecordEditorOpen, setIsRecordEditorOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MetadataRecord | undefined>(undefined);

    // New table form state
    const [newTableName, setNewTableName] = useState("");
    const [newTableDesc, setNewTableDesc] = useState("");

    const orgId = selectedOrg || "";

    // Queries
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

    // Mutations
    const createTableMutation = useMutation({
        mutationFn: (data: { name: string; description?: string }) =>
            metadataApi.createTable(orgId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["metadata", orgId, "tables"] });
            setIsCreateTableOpen(false);
            setNewTableName("");
            setNewTableDesc("");
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
            if (selectedTable?.name === deletingTableName) {
                setSelectedTable(null);
            }
            toast({ title: "Éxito", description: "Tabla eliminada" });
        }
    });

    const [deletingTableName, setDeletingTableName] = useState<string | null>(null);

    const saveRecordMutation = useMutation({
        mutationFn: (data: Record<string, any>) => {
            if (editingRecord) {
                return metadataApi.replaceRecord(orgId, selectedTable!.name, editingRecord.id, data);
            } else {
                return metadataApi.createRecord(orgId, selectedTable!.name, data);
            }
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

    if (!orgId) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Seleccione una organización para continuar</p>
            </div>
        );
    }

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
                                    className={`w-full group flex flex-col p-3 rounded-md text-left transition-all border border-transparent ${selectedTable?.name === table.name
                                            ? "bg-muted/60 border-border/40 shadow-sm"
                                            : "hover:bg-muted/30 text-muted-foreground"
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <TableIcon className={`h-3.5 w-3.5 shrink-0 ${selectedTable?.name === table.name ? "text-primary" : "text-muted-foreground/60"}`} />
                                            <span className={`text-[13.5px] truncate font-semibold ${selectedTable?.name === table.name ? "text-foreground" : ""}`}>
                                                {table.name}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono bg-background/50">
                                            {table.record_count || 0}
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
                {selectedTable ? (
                    <>
                        {/* Detail Header */}
                        <div className="px-8 py-3 bg-muted/10 border-b border-border/40 flex items-center justify-between shrink-0 h-[53px]">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <TableIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex items-baseline gap-2 overflow-hidden">
                                    <h3 className="text-[15px] font-bold text-foreground truncate">{selectedTable.name}</h3>
                                    <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                                        ({recordData?.total || 0} registros)
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    className="h-8 text-xs px-3"
                                    onClick={() => {
                                        setEditingRecord(undefined);
                                        setIsRecordEditorOpen(true);
                                    }}
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
                                                if (confirm(`¿Eliminar tabla "${selectedTable.name}"? Se perderán todos sus registros.`)) {
                                                    setDeletingTableName(selectedTable.name);
                                                    deleteTableMutation.mutate(selectedTable.name);
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

                        {/* Record List View */}
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
                                        Cree el primer registro agregando un objeto JSON o pares clave-valor.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-4 text-xs font-semibold border-dashed"
                                        onClick={() => {
                                            setEditingRecord(undefined);
                                            setIsRecordEditorOpen(true);
                                        }}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-2" />
                                        Crear Registro
                                    </Button>
                                </div>
                            ) : (
                                <ScrollArea className="h-full px-8 pt-6">
                                    <div className="overflow-x-auto">
                                        <Table className="border-none">
                                            <TableHeader className="[&_tr]:border-none">
                                                <TableRow className="hover:bg-transparent border-none">
                                                    <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide px-0">Datos (JSON Property Map)</TableHead>
                                                    <TableHead className="w-[120px] h-8 px-0" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recordData.items.map((record) => (
                                                    <TableRow
                                                        key={record.id}
                                                        className="group border-none hover:bg-muted/30 transition-colors"
                                                    >
                                                        <TableCell className="py-4 px-0 align-top">
                                                            <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                                                                {Object.entries(record.data).length === 0 ? (
                                                                    <span className="text-[12px] text-muted-foreground/40 italic px-2">{ } objeto vacío</span>
                                                                ) : (
                                                                    Object.entries(record.data).map(([key, val]) => (
                                                                        <div
                                                                            key={key}
                                                                            className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-background px-2 py-0.5"
                                                                        >
                                                                            <span className="text-[11px] font-bold uppercase tracking-tighter text-muted-foreground/80">{key}</span>
                                                                            <div className="w-[1px] h-3 bg-border/40" />
                                                                            <span className="text-[13px] text-foreground font-mono">{String(val)}</span>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4 px-0 text-right align-top">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                                                                    onClick={() => {
                                                                        setEditingRecord(record);
                                                                        setIsRecordEditorOpen(true);
                                                                    }}
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                                                                    onClick={() => {
                                                                        if (confirm("¿Eliminar este registro de metadatos?")) {
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
                                    <div className="h-10" /> {/* Bottom spacer */}
                                </ScrollArea>
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
                            Elija una organización y una tabla en el panel izquierdo para gestionar su información personalizada.
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
            <Dialog open={isCreateTableOpen} onOpenChange={setIsCreateTableOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Tabla de Metadatos</DialogTitle>
                        <DialogDescription>
                            Las tablas de metadatos le permiten almacenar información personalizada para su organización.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="tableName">Nombre de la Tabla</Label>
                            <Input
                                id="tableName"
                                placeholder="ej: machine_properties"
                                value={newTableName}
                                onChange={(e) => setNewTableName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tableDesc">Descripción (opcional)</Label>
                            <Input
                                id="tableDesc"
                                placeholder="ej: Propiedades estáticas de las máquinas"
                                value={newTableDesc}
                                onChange={(e) => setNewTableDesc(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateTableOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => createTableMutation.mutate({ name: newTableName, description: newTableDesc })}
                            disabled={!newTableName || createTableMutation.isPending}
                        >
                            Crear Tabla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isRecordEditorOpen && (
                <RecordEditorDialog
                    open={isRecordEditorOpen}
                    onOpenChange={setIsRecordEditorOpen}
                    tableName={selectedTable?.name || ""}
                    record={editingRecord}
                    onSave={(data) => saveRecordMutation.mutate(data)}
                />
            )}
        </div>
    );
}
