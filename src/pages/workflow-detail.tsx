import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { workflows as workflowsApi } from "@/lib/api";
import { useOrganization } from "@/providers/organization-provider";
import { useFetchTables, useUpdateTable, useDeleteTable } from "@/hooks/use-tables";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save, Trash2, LayoutGrid, Code2, TableProperties, Play, Square, OctagonX, History as HistoryIcon, ChevronUp, ChevronDown, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CreateTableDialog } from "@/components/CreateTableDialog";
import { EditWorkflowDialog } from "@/components/EditWorkflowDialog";
import { DependencyGraph } from "@/components/DependencyGraph";
import { SqlEditor } from "@/components/SqlEditor";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Workflow, WorkflowTable } from "@/lib/types";

function getTableDefinition(t: WorkflowTable): string {
    return t.definition ?? t.function?.definition ?? "";
}

function getTableFunctionType(t: WorkflowTable): string {
    return t.type ?? t.function?.type ?? "sql";
}

export default function WorkflowDetail() {
    const [match, params] = useRoute("/workflow/:id");
    const [, setLocation] = useLocation();
    const { selectedOrg } = useOrganization();
    const workflowId = params?.id ?? null;

    const { data: workflow, isLoading, isError } = useQuery<Workflow | null>({
        queryKey: ["organizations", selectedOrg, "workflows", workflowId],
        queryFn: async () => {
            if (!selectedOrg || !workflowId) return null;
            return apiRequest("GET", `/api/organizations/${selectedOrg}/workflows/${workflowId}`);
        },
        enabled: !!selectedOrg && !!workflowId,
    });
    const { data: tables = [] } = useFetchTables(workflowId);
    const updateTable = useUpdateTable();
    const deleteTable = useDeleteTable();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const invalidateWorkflow = () => {
        queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "workflows", workflowId] });
    };

    const startWorkflow = useMutation({
        mutationFn: () => workflowsApi.start(selectedOrg!, workflowId!),
        onSuccess: () => { toast({ title: "Workflow started" }); invalidateWorkflow(); },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const stopWorkflow = useMutation({
        mutationFn: () => workflowsApi.stop(selectedOrg!, workflowId!),
        onSuccess: () => { toast({ title: "Workflow stopped" }); invalidateWorkflow(); },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const terminateWorkflow = useMutation({
        mutationFn: () => workflowsApi.terminate(selectedOrg!, workflowId!),
        onSuccess: () => { toast({ title: "Workflow terminated" }); invalidateWorkflow(); },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const [prevOrg, setPrevOrg] = useState(selectedOrg);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("tables");
    const [sqlContent, setSqlContent] = useState<string>("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const [isEditWorkflowOpen, setIsEditWorkflowOpen] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Redirect to workflows list when organization changes
    useEffect(() => {
        if (prevOrg && selectedOrg && prevOrg !== selectedOrg) {
            setLocation("/workflows");
        }
        setPrevOrg(selectedOrg);
    }, [selectedOrg, prevOrg, setLocation]);

    // Sync editor content when selected table or tables data changes
    useEffect(() => {
        if (!tables?.length || !selectedTableId) {
            return;
        }
        const table = tables.find(t => t.id === selectedTableId);
        if (table) {
            setSqlContent(getTableDefinition(table));
            setHasUnsavedChanges(false);
        }
    }, [selectedTableId, tables]);

    // Handle saving SQL changes
    const handleSaveSql = useCallback((sql?: string) => {
        if (!selectedTableId || !workflowId || !workflow) return;
        const table = tables.find(t => t.id === selectedTableId);
        setSaveStatus("saving");
        updateTable.mutate({
            id: selectedTableId,
            workflowId,
            workflowType: workflow.type,
            type: table?.type ?? table?.function?.type,
            definition: sql ?? sqlContent,
        }, {
            onSuccess: () => {
                setHasUnsavedChanges(false);
                setSaveStatus("saved");
                setTimeout(() => setSaveStatus("idle"), 2000);
            },
            onError: (err) => {
                setSaveStatus("idle");
                toast({ title: "Error", description: err.message, variant: "destructive" });
            }
        });
    }, [selectedTableId, workflowId, workflow, tables, sqlContent, updateTable, toast]);

    // Cancel pending auto-save when switching tables
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [selectedTableId]);

    const handleDeleteTable = async (tableId: string) => {
        if (!workflowId || !confirm("Delete this table? This action cannot be undone.")) return;

        deleteTable.mutate({ id: tableId, workflowId }, {
            onSuccess: () => {
                if (selectedTableId === tableId) setSelectedTableId(null);
                toast({ title: "Deleted", description: "Table removed successfully" });
            },
            onError: () => toast({ title: "Error", description: "Failed to delete table", variant: "destructive" })
        });
    };

    const updateWorkflowMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (!selectedOrg || !workflowId) throw new Error("Missing organization or workflow ID");
            return apiRequest("PUT", `/api/organizations/${selectedOrg}/workflows/${workflowId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "workflows", workflowId] });
            toast({ title: "Workflow actualizado" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const handleUpdateWorkflowField = (field: string, value: any) => {
        updateWorkflowMutation.mutate({ [field]: value });
    };

    const handleUpdateWorkflowWindow = (field: string, value: any) => {
        if (!workflow) return;
        const currentWindow = workflow.window || { type: "tumbling" };
        const nextWindow = { ...currentWindow, [field]: value };
        updateWorkflowMutation.mutate({ window: nextWindow });
    };

    const handleUpdateTableField = (field: keyof WorkflowTable, value: any) => {
        if (!selectedTableId || !workflowId || !workflow) return;

        updateTable.mutate({
            id: selectedTableId,
            workflowId,
            workflowType: workflow.type,
            [field as string]: value,
        }, {
            onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
        });
    };

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (isError || !workflow) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
                <h2 className="text-xl font-bold">Workflow not found</h2>
                <Button variant="outline" onClick={() => setLocation("/workflows")}>Back to Workflows</Button>
            </div>
        );
    }

    const selectedTable = tables.find(t => t.id === selectedTableId);
    const selectedTableType = selectedTable ? getTableFunctionType(selectedTable) : "sql";
    const selectedTableUpsertConstraints = selectedTable?.upsert_constraints?.join(", ") ?? "";

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
            {/* Top Bar */}
            <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/workflows">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold text-lg">{workflow.name}</h1>
                        <Badge variant="outline" className="font-mono text-xs">{workflow.window?.type ?? "tumbling"}</Badge>
                        {workflow.status && (
                            <Badge
                                variant={workflow.status === "running" ? "default" : "secondary"}
                                className={`text-xs capitalize ${workflow.status === "running"
                                    ? "bg-green-500/15 text-green-600 border-green-500/30"
                                    : workflow.status === "terminated"
                                        ? "bg-red-500/15 text-red-600 border-red-500/30"
                                        : ""
                                    }`}
                            >
                                {workflow.status}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Status Dot / Indicator - Neutral */}
                    {workflow.status === "running" && (
                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-muted/20 border border-border/40 mr-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted-foreground/30 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/60"></span>
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Live</span>
                        </div>
                    )}

                    <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5 h-7 text-[12px] font-medium bg-blue-600 hover:bg-blue-700 text-white border-none transition-all px-2.5 rounded-[4px] shadow-sm disabled:bg-muted/30 disabled:text-muted-foreground"
                        disabled={workflow.status === "running" || startWorkflow.isPending}
                        onClick={() => startWorkflow.mutate()}
                    >
                        {startWorkflow.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin text-white/70" />
                        ) : (
                            <Play className="h-3 w-3 text-white fill-white" />
                        )}
                        Start
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-[12px] font-medium bg-transparent border-border/60 text-foreground hover:bg-muted/50 hover:border-border transition-all px-2.5 rounded-[4px]"
                        disabled={workflow.status !== "running" || stopWorkflow.isPending}
                        onClick={() => stopWorkflow.mutate()}
                    >
                        {stopWorkflow.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : (
                            <Square className="h-2.5 w-2.5 text-muted-foreground/80 fill-muted-foreground/40" />
                        )}
                        Stop
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-[12px] font-medium bg-transparent border-border/60 text-foreground hover:bg-muted/50 hover:border-border transition-all px-2.5 rounded-[4px]"
                        disabled={workflow.status !== "running" || terminateWorkflow.isPending}
                        onClick={() => {
                            if (!confirm(`Terminate workflow "${workflow.name}"? This will forcefully stop execution.`)) return;
                            terminateWorkflow.mutate();
                        }}
                    >
                        {terminateWorkflow.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : (
                            <OctagonX className="h-3.5 w-3.5 text-muted-foreground/80" />
                        )}
                        Terminate
                    </Button>

                    <div className="w-px h-4 bg-border/60 mx-1" />

                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-[12px] font-medium bg-transparent border-border/60 text-foreground hover:bg-muted/50 hover:border-border transition-all px-2.5 rounded-[4px]"
                        onClick={() => setLocation(`/workflow/${workflowId}/runs`)}
                    >
                        <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                        History
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 border-border/60 bg-transparent hover:bg-muted/50 rounded-[4px]"
                        onClick={() => setIsEditWorkflowOpen(true)}
                    >
                        <SettingsIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>

                </div>
                <EditWorkflowDialog workflow={workflow} open={isEditWorkflowOpen} onOpenChange={setIsEditWorkflowOpen} />
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar / Table List */}
                <aside className="w-64 border-r border-border bg-card/30 flex flex-col shrink-0">
                    <div className="p-4 border-b border-border/50 flex items-center justify-between">
                        <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                            <TableProperties className="h-4 w-4" /> Tables ({tables.length})
                        </h2>
                        <CreateTableDialog workflowId={workflow.id} workflowType={workflow.type} />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {tables.map(table => (
                            <div
                                key={table.id}
                                onClick={() => setSelectedTableId(table.id)}
                                className={`
                   group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                   ${selectedTableId === table.id
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-foreground hover:bg-muted"}
                 `}
                            >
                                <div className="truncate flex-1">{table.name}</div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        {tables.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                No tables defined.
                            </div>
                        )}
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 flex flex-col overflow-hidden bg-background">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                        <div className="border-b border-border bg-card/30 px-4 flex items-center justify-between">
                            <TabsList className="bg-transparent h-12">
                                <TabsTrigger value="tables" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none h-12 border-b-2 border-transparent data-[state=active]:border-primary px-6">
                                    <Code2 className="h-4 w-4 mr-2" /> Editor
                                </TabsTrigger>
                                <TabsTrigger value="graph" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none h-12 border-b-2 border-transparent data-[state=active]:border-primary px-6">
                                    <LayoutGrid className="h-4 w-4 mr-2" /> Graph View
                                </TabsTrigger>
                                <TabsTrigger value="properties" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none h-12 border-b-2 border-transparent data-[state=active]:border-primary px-6">
                                    <TableProperties className="h-4 w-4 mr-2" /> Properties
                                </TabsTrigger>
                            </TabsList>

                            {activeTab === "tables" && selectedTable && (
                                <div className="flex items-center gap-2">
                                    {saveStatus === "saving" && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                                        </span>
                                    )}
                                    {saveStatus === "saved" && (
                                        <span className="text-xs text-green-500">Saved</span>
                                    )}
                                    {saveStatus === "idle" && hasUnsavedChanges && (
                                        <span className="text-xs text-amber-500">Unsaved</span>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSaveSql()}
                                        disabled={!hasUnsavedChanges || saveStatus === "saving"}
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        Save
                                    </Button>
                                </div>
                            )}
                        </div>

                        <TabsContent value="tables" className="flex-1 m-0 p-0 overflow-hidden relative">
                            {selectedTable ? (
                                <div className="h-full flex flex-col">
                                    <div className="flex-1 relative">
                                        <SqlEditor
                                            key={selectedTableId}
                                            value={sqlContent}
                                            onChange={(val) => {
                                                const next = val || "";
                                                setSqlContent(next);
                                                setHasUnsavedChanges(true);
                                                setSaveStatus("idle");
                                                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                                                saveTimerRef.current = setTimeout(() => handleSaveSql(next), 1500);
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                                    <div className="p-4 bg-muted/20 rounded-full">
                                        <Code2 className="h-12 w-12 opacity-50" />
                                    </div>
                                    <p>Select a table from the sidebar to edit its logic.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="graph" className="flex-1 m-0 p-0 overflow-hidden bg-zinc-900/10">
                            <DependencyGraph
                                tables={tables}
                                onNodeClick={(id: string) => {
                                    setSelectedTableId(id);
                                    setActiveTab("tables");
                                }}
                                selectedTableId={selectedTableId || undefined}
                            />
                        </TabsContent>

                        <TabsContent value="properties" className="flex-1 m-0 p-0 overflow-auto">
                            {selectedTable ? (
                                <div key={selectedTable.id} className="p-6 max-w-3xl space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-base font-semibold">Table Properties</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Editing fields for a <span className="font-medium">{workflow.type}</span> workflow table.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="table-name">Name</Label>
                                            <Input
                                                id="table-name"
                                                defaultValue={selectedTable.name ?? ""}
                                                onBlur={(e) => handleUpdateTableField("name", e.target.value.trim())}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="table-type">Function type</Label>
                                            <Select
                                                value={selectedTableType}
                                                onValueChange={(val) => {
                                                    updateTable.mutate({
                                                        id: selectedTable.id,
                                                        workflowId: workflow.id,
                                                        workflowType: workflow.type,
                                                        type: val,
                                                        definition: getTableDefinition(selectedTable),
                                                    }, {
                                                        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                                                    });
                                                }}
                                            >
                                                <SelectTrigger id="table-type">
                                                    <SelectValue placeholder="Select function type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sql">sql</SelectItem>
                                                    <SelectItem value="python">python</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {workflow.type === "batch" && (
                                        <div className="space-y-4 p-4 rounded-md border bg-card/40">
                                            <h4 className="text-sm font-semibold">Batch table settings</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="table-order">Order</Label>
                                                    <Input
                                                        id="table-order"
                                                        type="number"
                                                        defaultValue={selectedTable.order ?? 0}
                                                        onBlur={(e) => handleUpdateTableField("order", Number(e.target.value || 0))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="table-time-column">Time column</Label>
                                                    <Input
                                                        id="table-time-column"
                                                        defaultValue={selectedTable.time_column ?? ""}
                                                        onBlur={(e) => handleUpdateTableField("time_column", e.target.value.trim() || null)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="table-upsert-constraints">Upsert constraints (comma separated)</Label>
                                                <Input
                                                    id="table-upsert-constraints"
                                                    defaultValue={selectedTableUpsertConstraints}
                                                    onBlur={(e) => {
                                                        const value = e.target.value
                                                            .split(",")
                                                            .map((x) => x.trim())
                                                            .filter(Boolean);
                                                        handleUpdateTableField("upsert_constraints", value);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {workflow.type === "stream" && (
                                        <div className="space-y-4 p-4 rounded-md border bg-card/40">
                                            <h4 className="text-sm font-semibold">Stream table settings</h4>
                                            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                                <div>
                                                    <Label htmlFor="table-publish" className="font-normal">Publish</Label>
                                                    <p className="text-xs text-muted-foreground">Publish transformed results</p>
                                                </div>
                                                <Checkbox
                                                    id="table-publish"
                                                    checked={!!selectedTable.publish}
                                                    onCheckedChange={(checked) =>
                                                        handleUpdateTableField("publish", Boolean(checked))
                                                    }
                                                />
                                            </div>
                                            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                                <div>
                                                    <Label htmlFor="table-memory" className="font-normal">Memory</Label>
                                                    <p className="text-xs text-muted-foreground">Keep results in memory</p>
                                                </div>
                                                <Checkbox
                                                    id="table-memory"
                                                    checked={!!selectedTable.memory}
                                                    onCheckedChange={(checked) =>
                                                        handleUpdateTableField("memory", Boolean(checked))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                                    <div className="p-4 bg-muted/20 rounded-full">
                                        <TableProperties className="h-12 w-12 opacity-50" />
                                    </div>
                                    <p>Select a table from the sidebar to edit its properties.</p>
                                </div>
                            )}
                        </TabsContent>


                    </Tabs>
                </main>
            </div>
        </div>
    );
}
