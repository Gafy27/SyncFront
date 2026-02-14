import {
  LayoutDashboard,
  Building2,
  Boxes,
  Radio,
  Plug,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/providers/organization-provider";
import syncLogoWhite from "@assets/Logo Nutria Sync(1)_1763339643787.png";
import syncLogoDark from "@assets/Logo Nutria Sync_1763339643787.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Organizaciones",
    url: "/organizations",
    icon: Building2,
  },
  {
    title: "Aplicaciones",
    url: "/applications",
    icon: Boxes,
  },
  {
    title: "Gateways",
    url: "/gateways",
    icon: Radio,
  },

];

export function AppSidebar() {
  const [location] = useLocation();
  const { organizations, selectedOrg, setSelectedOrg, isLoading } =
    useOrganization();

  return (
    <Sidebar>
      <SidebarContent className="p-6">
        <div className="mb-8">
          <img
            src={syncLogoWhite}
            alt="Sync"
            className="h-24 w-auto dark:block hidden"
          />
          <img
            src={syncLogoDark}
            alt="Sync"
            className="h-24 w-auto dark:hidden block"
          />
        </div>

        <div className="mb-6">
          <Label className="text-xs text-muted-foreground mb-2 block">
            Organizacion
          </Label>
          <Select
            value={selectedOrg || undefined}
            onValueChange={setSelectedOrg}
            disabled={isLoading || organizations.length === 0}
          >
            <SelectTrigger
              className="w-full"
              data-testid="select-organization"
            >
              <SelectValue placeholder="Selecciona una org" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  item.url === "/"
                    ? location === "/"
                    : location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link
                        href={item.url}
                        data-testid={`link-${item.title.toLowerCase()}`}
                      >
                        <item.icon
                          className={isActive ? "text-primary" : ""}
                        />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6">
        <div className="text-xs text-muted-foreground">
          <div className="font-medium">SyncCore Platform</div>
          <div className="mt-1">v2.0.0</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
