import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrganizationProvider } from "@/providers/organization-provider";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Organizations from "@/pages/organizations";
import OrganizationSettings from "@/pages/organization-settings";
import OrganizationDetail from "@/pages/organization-detail";
import Connectors from "@/pages/connectors";
import NewBridge from "@/pages/connectors-new";
import BridgeDetail from "@/pages/connector-detail";
import Bridges from "@/pages/bridges";
import Events from "@/pages/events";
import Machines from "@/pages/machines";
import NewMachine from "@/pages/machines-new";
import MachineDetail from "@/pages/machine-detail";
import NotFound from "@/pages/not-found";
import Workflows from "@/pages/workflows";
import WorkflowDetail from "@/pages/workflow-detail";
import WorkflowRuns from "@/pages/workflow-runs";
import WorkflowRunDetail from "@/pages/workflow-run-detail";
import SqlEditorPage from "@/pages/sql-editor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/organizations" component={Organizations} />
      <Route
        path="/organizations/:orgId/settings"
        component={OrganizationSettings}
      />
      <Route path="/organizations/:orgId" component={OrganizationDetail} />
      {/* Connector Templates Catalog (global) */}
      <Route path="/bridges" component={Bridges} />
      <Route path="/bridges/new/:templateId?" component={NewBridge} />
      <Route path="/bridges/:bridgeId" component={BridgeDetail} />
      {/* Events */}
      <Route path="/events" component={Events} />
      {/* Machines */}
      <Route path="/machines" component={Machines} />
      <Route path="/machines/new" component={NewMachine} />
      <Route path="/machines/:machineId" component={MachineDetail} />
      {/* Workflows */}
      <Route path="/workflows" component={Workflows} />
      <Route path="/workflow/:id/runs/:runId" component={WorkflowRunDetail} />
      <Route path="/workflow/:id/runs" component={WorkflowRuns} />
      <Route path="/workflow/:id" component={WorkflowDetail} />
      <Route path="/sql-editor" component={SqlEditorPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("auth_token")
  );

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
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between p-4 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </OrganizationProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
