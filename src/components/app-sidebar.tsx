import {
  LayoutDashboard,
  Building2,
  Cable,
  Cpu,
  Zap,
  Workflow,
  TerminalSquare,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/providers/organization-provider";
import { cn } from "@/lib/utils";
import syncLogoWhite from "@assets/Logo Nutria Sync(1)_1763339643787.png";
import syncLogoDark from "@assets/Logo Nutria Sync_1763339643787.png";

const menuItems = [
  { title: "Dashboard",      url: "/",             icon: LayoutDashboard },
  { title: "Organizaciones", url: "/organizations", icon: Building2 },
  { title: "Bridges",        url: "/bridges",       icon: Cable },
  { title: "Máquinas",       url: "/machines",      icon: Cpu },
  { title: "Eventos",        url: "/events",        icon: Zap },
  { title: "Workflows",      url: "/workflows",     icon: Workflow },
  { title: "SQL Editor",     url: "/sql-editor",    icon: TerminalSquare },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { organizations, selectedOrg, setSelectedOrg, isLoading } = useOrganization();

  return (
    <Sidebar>
      <SidebarContent className="flex flex-col gap-0 p-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-border/40">
          <img src={syncLogoWhite} alt="Sync" className="h-7 w-auto dark:block hidden" />
          <img src={syncLogoDark}  alt="Sync" className="h-7 w-auto dark:hidden block" />
        </div>

        {/* Org selector */}
        <div className="px-3 py-3 border-b border-border/40">
          <Select
            value={selectedOrg || undefined}
            onValueChange={setSelectedOrg}
            disabled={isLoading || organizations.length === 0}
          >
            <SelectTrigger
              className="w-full h-8 text-xs border-border/50 bg-transparent focus:ring-0"
              data-testid="select-organization"
            >
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={String(org.id)} value={String(org.id)} className="text-xs">
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
