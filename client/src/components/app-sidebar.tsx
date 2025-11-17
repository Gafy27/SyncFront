import { LayoutDashboard, Building2, Users, Radio, Server, Boxes, Brain, Settings } from "lucide-react";
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
import syncLogo from "@assets/SyncLogoWhite_1763336721079.png";

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
    title: "Usuarios",
    url: "/users",
    icon: Users,
  },
  {
    title: "Gateways",
    url: "/gateways",
    icon: Radio,
  },
  {
    title: "Edges",
    url: "/edges",
    icon: Server,
  },
  {
    title: "Aplicaciones",
    url: "/applications",
    icon: Boxes,
  },
  {
    title: "Modelos IA",
    url: "/ai-models",
    icon: Brain,
  },
  {
    title: "Administración",
    url: "/admin",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent className="p-6">
        <div className="mb-8">
          <img src={syncLogo} alt="Sync" className="h-16 w-auto dark:invert-0 invert" />
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className={isActive ? "text-primary" : ""} />
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
          <div className="font-medium">Autentio IoT Platform</div>
          <div className="mt-1">v1.0.0</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
