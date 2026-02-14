import { useRoute, Link, useLocation } from "wouter";
import { useWorkflow, useUpdateWorkflow } from "@/hooks/use-workflows";
import { useUpdateTable, useDeleteTable } from "@/hooks/use-tables";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save, Trash2, LayoutGrid, Code2, Settings, TableProperties } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreateTableDialog } from "@/components/CreateTableDialog";
import { DependencyGraph } from "@/components/DependencyGraph";
import { SqlEditor } from "@/components/SqlEditor";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function WorkflowDetail() {
  const [match, params] = useRoute("/workflow/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : null;
  
  const { data: workflow, isLoading, isError } = useWorkflow(id);
  const updateWorkflow = useUpdateWorkflow();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();
  const { toast } = useToast();

  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("tables");
  const [sqlContent, setSqlContent] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync selected table's SQL to editor when selection changes
  useEffect(() => {
    if (workflow && selectedTableId) {
      const table = workflow.tables.find(t => t.id === selectedTableId);
      if (table) {
        setSqlContent(table.definition);
        setHasUnsavedChanges(false);
      }
    }
  }, [selectedTableId, workflow]);

  // Handle saving SQL changes
  const handleSaveSql = () => {
    if (!selectedTableId || !id) return;
    
    updateTable.mutate({
      id: selectedTableId,
      workflowId: id,
      definition: sqlContent,
    }, {
      onSuccess: () => {
        setHasUnsavedChanges(false);
        toast({ title: "Saved", description: "Table definition updated successfully" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!id || !confirm("Delete this table? This action cannot be undone.")) return;

    deleteTable.mutate({ id: tableId, workflowId: id }, {
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
        <Button variant="outline" onClick={() => setLocation("/")}>Back to Home</Button>
      </div>
    );
  }

  const selectedTable = workflow.tables.find(t => t.id === selectedTableId);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg">{workflow.name}</h1>
            <Badge variant="outline" className="font-mono text-xs">{workflow.windowConfig?.type || "tumbling"}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CreateTableDialog workflowId={workflow.id} />
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar / Table List */}
        <aside className="w-64 border-r border-border bg-card/30 flex flex-col shrink-0">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <TableProperties className="h-4 w-4" /> Tables ({workflow.tables.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {workflow.tables.map(table => (
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
            {workflow.tables.length === 0 && (
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
                  {hasUnsavedChanges && <span className="text-xs text-amber-500 mr-2">Unsaved changes</span>}
                  <Button 
                    size="sm" 
                    onClick={handleSaveSql}
                    disabled={!hasUnsavedChanges || updateTable.isPending}
                    className={hasUnsavedChanges ? "animate-pulse" : ""}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateTable.isPending ? "Saving..." : "Save SQL"}
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="tables" className="flex-1 m-0 p-0 overflow-hidden relative">
              {selectedTable ? (
                <div className="h-full flex flex-col">
                  <div className="bg-muted/30 px-4 py-2 text-xs font-mono border-b border-border/50 text-muted-foreground flex gap-4">
                    <span>Function: {selectedTable.functionType}</span>
                    <span>Time Column: {selectedTable.timeColumn || "N/A"}</span>
                  </div>
                  <div className="flex-1 relative">
                    <SqlEditor 
                      value={sqlContent} 
                      onChange={(val) => {
                        setSqlContent(val || "");
                        setHasUnsavedChanges(true);
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
                 tables={workflow.tables} 
                 onNodeClick={(id) => {
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
