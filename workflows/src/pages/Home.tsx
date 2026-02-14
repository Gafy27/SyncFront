import { useWorkflows, useDeleteWorkflow } from "@/hooks/use-workflows";
import { useImportYaml, useExportYaml } from "@/hooks/use-yaml";
import { CreateWorkflowDialog } from "@/components/CreateWorkflowDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { FileDown, FileUp, Database, ArrowRight, Trash2, Loader2, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const { data: workflows, isLoading, isError } = useWorkflows();
  const deleteWorkflow = useDeleteWorkflow();
  const { toast } = useToast();
  
  const importYaml = useImportYaml();
  const exportYaml = useExportYaml();
  const [yamlInput, setYamlInput] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const handleExport = async () => {
    try {
      const { yamlContent } = await exportYaml.mutateAsync();
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workflows.yml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Workflows exported successfully" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to export workflows", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    try {
      await importYaml.mutateAsync(yamlInput);
      setImportOpen(false);
      setYamlInput("");
      // Force refresh (handled by query invalidation usually, but reloading queries manually is safe here)
      // Actually invalidation should happen automatically if hooks are set up right.
      // Assuming useImportYaml invalidates queries or we reload page.
      window.location.reload(); 
      toast({ title: "Success", description: "Workflows imported successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault(); // Prevent navigation
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    
    try {
      await deleteWorkflow.mutateAsync(id);
      toast({ title: "Deleted", description: "Workflow removed" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete workflow", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              SQL Workflow Manager
            </h1>
            <p className="text-muted-foreground mt-2">
              Orchestrate your batch data pipelines with SQL rules and dependencies.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport} disabled={exportYaml.isPending}>
              <FileDown className="mr-2 h-4 w-4" />
              Export YAML
            </Button>
            
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileUp className="mr-2 h-4 w-4" />
                  Import YAML
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Import Workflows Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Textarea 
                    placeholder="Paste your YAML configuration here..." 
                    className="h-[300px] font-mono text-xs"
                    value={yamlInput}
                    onChange={(e) => setYamlInput(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={importYaml.isPending || !yamlInput}>
                      {importYaml.isPending ? "Importing..." : "Import"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Sidebar Area */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
              <CreateWorkflowDialog />
            </div>
            <div className="bg-card/50 rounded-xl p-4 border border-border/50">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Stats</h3>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? "-" : workflows?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active Workflows</p>
            </div>
          </div>

          {/* List Area */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="text-center py-20 text-destructive">
                Failed to load workflows. Please try again.
              </div>
            ) : workflows?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-dashed border-border text-center">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <PlayCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No workflows yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                  Create your first workflow to start defining SQL transformation rules.
                </p>
                <div className="w-48">
                  <CreateWorkflowDialog />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {workflows?.map((workflow) => (
                  <Link key={workflow.id} href={`/workflow/${workflow.id}`} className="group block">
                    <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer group-hover:-translate-y-1 relative">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg text-primary group-hover:underline decoration-primary/50 underline-offset-4">
                            {workflow.name}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDelete(e, workflow.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardDescription>
                          Window Type: {workflow.windowConfig?.type || "tumbling"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Database className="h-4 w-4" />
                          <span>{workflow.tables?.length || 0} Tables</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 border-t border-border/50 mt-auto bg-muted/20">
                        <div className="flex items-center text-sm font-medium text-primary w-full justify-end">
                          Open Workflow <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
