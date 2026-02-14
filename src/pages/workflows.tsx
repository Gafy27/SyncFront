import { useWorkflows, useDeleteWorkflow } from "src/hooks/use-workflows";
import { CreateWorkflowDialog } from "src/components/CreateWorkflowDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Database, ArrowRight, Trash2, Loader2, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Home() {
  const { data: workflows, isLoading, isError } = useWorkflows();
  const deleteWorkflow = useDeleteWorkflow();
  const { toast } = useToast();

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
