import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrganizationProvider } from "@/providers/organization-provider";
import Dashboard from "@/pages/dashboard";
import Organizations from "@/pages/organizations";
import OrganizationSettings from "@/pages/organization-settings";
import OrganizationDetail from "@/pages/organization-detail";
import Gateways from "@/pages/gateways";
import Connectors from "@/pages/connectors";
import NewConnector from "@/pages/connectors-new";
import ConnectorDetail from "@/pages/connector-detail";
import Applications from "@/pages/applications";
import NewApplication from "@/pages/applications-new";
import NewMachine from "@/pages/machines-new";
import MachineDetail from "@/pages/machine-detail";
import NotFound from "@/pages/not-found";

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
      <Route path="/gateways" component={Gateways} />
      <Route path="/connectors" component={Connectors} />
      <Route
        path="/connectors/new/:applicationId/:templateId"
        component={NewConnector}
      />
      <Route
        path="/connectors/new/:applicationId"
        component={NewConnector}
      />
      <Route
        path="/connectors/:applicationId/:connectorId"
        component={ConnectorDetail}
      />
      <Route path="/applications" component={Applications} />
      <Route path="/applications/new" component={NewApplication} />
      <Route path="/machines/new/:applicationId?" component={NewMachine} />
      <Route
        path="/machines/:applicationId/:eui"
        component={MachineDetail}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

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
