import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AgentChatPanel } from "@/components/agent-chat-panel";
import { Bot } from "lucide-react";
import { OrganizationProvider } from "@/providers/organization-provider";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import OrganizationConfig from "@/pages/organization-config";
import Connectors from "@/pages/connectors";
import NewBridge from "@/pages/connectors-new";
import BridgeDetail from "@/pages/connector-detail";
import Bridges from "@/pages/bridges";
import Events from "@/pages/events";
import NotFound from "@/pages/not-found";
import Workflows from "@/pages/workflows";
import WorkflowDetail from "@/pages/workflow-detail";
import WorkflowRuns from "@/pages/workflow-runs";
import WorkflowRunDetail from "@/pages/workflow-run-detail";
import SqlEditorPage from "@/pages/sql-editor";
import MetadataPage from "@/pages/metadata";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/config" component={OrganizationConfig} />
      {/* Connector Templates Catalog (global) */}
      <Route path="/bridges" component={Bridges} />
      <Route path="/bridges/new/:templateId?" component={NewBridge} />
      <Route path="/bridges/:bridgeId" component={BridgeDetail} />
      {/* Events */}
      <Route path="/events" component={Events} />
      {/* Workflows */}
      <Route path="/workflows" component={Workflows} />
      <Route path="/workflow/:id/runs/:runId" component={WorkflowRunDetail} />
      <Route path="/workflow/:id/runs" component={WorkflowRuns} />
      <Route path="/workflow/:id" component={WorkflowDetail} />
      <Route path="/sql-editor" component={SqlEditorPage} />
      <Route path="/metadata" component={MetadataPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("auth_token")
  );
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsAuthenticated(false);
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, []);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginPage onLogin={() => setIsAuthenticated(true)} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OrganizationProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full overflow-hidden">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between px-4 py-2 border-b border-border/40">
                  <SidebarTrigger data-testid="button-sidebar-toggle" className="h-7 w-7 text-muted-foreground hover:text-foreground" />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsChatOpen((v) => !v)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Toggle Agent"
                    >
                      <Bot className="h-3.5 w-3.5" />
                    </button>
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto no-scrollbar">
                  <Router />
                </main>
              </div>
              <AgentChatPanel
                open={isChatOpen}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          </SidebarProvider>
        </OrganizationProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
