import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { workflows as workflowsApi } from "@/lib/api";
import { useOrganization } from "@/providers/organization-provider";
import { useFetchTables, useUpdateTable, useDeleteTable } from "@/hooks/use-tables";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save, Trash2, LayoutGrid, Code2, TableProperties, Play, Square, OctagonX, ScrollText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CreateTableDialog } from "@/components/CreateTableDialog";
import { DependencyGraph } from "@/components/DependencyGraph";
import { SqlEditor } from "@/components/SqlEditor";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Workflow, WorkflowTable } from "@/lib/types";

function getTableDefinition(t: WorkflowTable): string {
    return t.definition ?? t.function?.definition ?? "";
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
                    {/* Lifecycle actions */}
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-green-600 border-green-500/40 hover:bg-green-500/10"
                        disabled={workflow.status === "running" || startWorkflow.isPending}
                        onClick={() => startWorkflow.mutate()}
                    >
                        {startWorkflow.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-green-600" />}
                        Start
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={workflow.status !== "running" || stopWorkflow.isPending}
                        onClick={() => stopWorkflow.mutate()}
                    >
                        {stopWorkflow.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                        Stop
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                        disabled={workflow.status !== "running" || terminateWorkflow.isPending}
                        onClick={() => {
                            if (!confirm(`Terminate workflow "${workflow.name}"? This will forcefully stop execution.`)) return;
                            terminateWorkflow.mutate();
                        }}
                    >
                        {terminateWorkflow.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <OctagonX className="h-3.5 w-3.5" />}
                        Terminate
                    </Button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setLocation(`/workflow/${workflowId}/runs`)}
                    >
                        <ScrollText className="h-3.5 w-3.5" />
                        Logs
                    </Button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <CreateTableDialog workflowId={workflow.id} workflowType={workflow.type} />
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar / Table List */}
                <aside className="w-64 border-r border-border bg-card/30 flex flex-col shrink-0">
                    <div className="p-4 border-b border-border/50">
                        <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                            <TableProperties className="h-4 w-4" /> Tables ({tables.length})
                        </h2>
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
                                    <div className="bg-muted/30 px-4 py-2 text-xs font-mono border-b border-border/50 text-muted-foreground flex gap-4">
                                        <span>Type: {selectedTable.function?.type ?? selectedTable.type ?? "sql"}</span>
                                        <span>Publish: {selectedTable.publish !== false ? "yes" : "no"}</span>
                                        <span>Memory: {selectedTable.memory ? "yes" : "no"}</span>
                                    </div>
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

                        <TabsContent value="graph" className="flex-1 m-0 p-0 overflow-hidden bg-zinc-900">
                            <DependencyGraph
                                tables={tables}
                                onNodeClick={(id: string) => {
                                    setSelectedTableId(id);
                                    setActiveTab("tables");
                                }}
                                selectedTableId={selectedTableId || undefined}
                            />
                        </TabsContent>
                    </Tabs>
                </main>

            </div>
        </div>
    );
}
