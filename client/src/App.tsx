import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import Organizations from "@/pages/organizations";
import Users from "@/pages/users";
import Devices from "@/pages/devices";
import Gateways from "@/pages/gateways";
import Edges from "@/pages/edges";
import Connectors from "@/pages/connectors";
import Applications from "@/pages/applications";
import NewMachine from "@/pages/machines-new";
import AiModels from "@/pages/ai-models";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/organizations" component={Organizations} />
      <Route path="/users" component={Users} />
      <Route path="/devices" component={Devices} />
      <Route path="/gateways" component={Gateways} />
      <Route path="/edges" component={Edges} />
      <Route path="/connectors" component={Connectors} />
      <Route path="/applications" component={Applications} />
      <Route path="/machines/new" component={NewMachine} />
      <Route path="/ai-models" component={AiModels} />
      <Route path="/admin" component={Admin} />
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
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
