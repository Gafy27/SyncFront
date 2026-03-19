import {
  LayoutDashboard,
  Settings,
  Cable,
  Zap,
  Workflow,
  TerminalSquare,
  Check,
  ChevronsUpDown,
  Plus,
  Building2,
  Settings as SettingsIcon,
  Database,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrganization } from "@/providers/organization-provider";
import { cn } from "@/lib/utils";
import syncLogoWhite from "@assets/noval.png";
import syncLogoDark from "@assets/noval.png";
import { useState } from "react";
import { organizations as orgsApi } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Organization } from "@/lib/types";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Bridges", url: "/bridges", icon: Cable },
  { title: "Eventos", url: "/events", icon: Zap },
  { title: "Workflows", url: "/workflows", icon: Workflow },
  { title: "SQL Editor", url: "/sql-editor", icon: TerminalSquare },
  { title: "Metadatos", url: "/metadata", icon: Database },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { organizations, selectedOrg, currentOrg, setSelectedOrg, isLoading } = useOrganization();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: Partial<Organization>) => orgsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setIsCreateOpen(false);
      setNewOrgName("");
      toast({ title: "Organización creada", description: "La organización se ha creado correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newOrgName.trim()) return;
    createMutation.mutate({
      name: newOrgName.trim(),
      slug: newOrgName.trim().toLowerCase().replace(/\s+/g, "-"),
      status: "active",
    });
  };

  return (
    <Sidebar>
      <SidebarContent className="flex flex-col gap-0 p-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-border/40">
          <img src={syncLogoWhite} alt="Sync" className="h-7 w-auto dark:block hidden" />
          <img src={syncLogoDark} alt="Sync" className="h-7 w-auto dark:hidden block" />
        </div>

        {/* Org selector dropdown */}
        <div className="px-3 py-3 border-b border-border/40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left focus:outline-none focus:ring-1 focus:ring-primary/20"
                data-testid="select-organization"
              >
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">
                    {currentOrg?.name || "Select Org"}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {currentOrg?.slug || "Default Team"}
                  </p>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px] p-1.5" side="right" sideOffset={12}>
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase font-medium tracking-wider">
                Organizations
              </DropdownMenuLabel>
              <div className="space-y-0.5 max-h-[300px] overflow-auto no-scrollbar">
                {organizations.map((org) => {
                  const isActive = String(org.id) === selectedOrg;
                  return (
                    <DropdownMenuItem
                      key={String(org.id)}
                      onClick={() => setSelectedOrg(String(org.id))}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-foreground/70" />
                      </div>
                      <span className="flex-1 text-sm truncate">{org.name}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem
                onClick={() => setLocation("/config")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-muted-foreground"
              >
                <SettingsIcon className="w-4 h-4" />
                <span className="text-sm">Organization Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-muted-foreground"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">New Organization</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Organización</DialogTitle>
              <DialogDescription>Cree una nueva organización para su equipo</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nombre</Label>
                <Input
                  id="org-name"
                  placeholder="Mi Organización"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Nav */}
        <div className="flex-1 px-2 py-3">
          <p className="px-3 mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
            Navigation
          </p>
          <SidebarMenu>
            {menuItems.map((item) => {
              const isActive = item.url === "/" ? location === "/" : location.startsWith(item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <Link
                    href={item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.title}
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter className="px-5 py-4 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground/50">SyncCore v2.0.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}
