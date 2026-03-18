import { Plus, Building2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useOrganization } from "@/providers/organization-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { organizations as orgsApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Organization, OrgStats } from "@/lib/types";

export default function Organizations() {
  const [, setLocation] = useLocation();
  const { organizations, isLoading } = useOrganization();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: Partial<Organization>) => orgsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setIsCreateOpen(false);
      setNewOrgName("");
      setNewOrgSlug("");
      toast({
        title: "Organizacion creada",
        description: "La organizacion se ha creado correctamente",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newOrgName.trim()) return;
    createMutation.mutate({
      name: newOrgName.trim(),
      slug: newOrgSlug.trim() || newOrgName.trim().toLowerCase().replace(/\s+/g, "-"),
      status: "active",
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Organizaciones</span>
        </div>
        <Button
          size="sm"
          data-testid="button-add-organization"
          onClick={() => setIsCreateOpen(true)}
          className="h-8 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Nueva Organización
        </Button>
      </div>

      {/* Grid */}
      <div className="p-6">
        {isLoading && (
          <div className="text-muted-foreground text-sm">Cargando organizaciones...</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {organizations.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              onClick={() => setLocation(`/organizations/${org.id}`)}
            />
          ))}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Organizacion</DialogTitle>
            <DialogDescription>Cree una nueva organizacion para su equipo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nombre</Label>
              <Input
                id="org-name"
                placeholder="Mi Organizacion"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug (opcional)</Label>
              <Input
                id="org-slug"
                placeholder="mi-organizacion"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
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
    </div>
  );
}

function OrgCard({ org, onClick }: { org: Organization; onClick: () => void }) {
  const { data: stats } = useQuery<OrgStats>({
    queryKey: ["org-stats", org.id],
    queryFn: () => orgsApi.stats(org.id),
    retry: false,
  });

  const isActive = org.status === "active";

  return (
    <div
      data-testid={`card-organization-${org.id}`}
      onClick={onClick}
      className="group relative flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border/50 hover:border-border hover:bg-muted/60 transition-all cursor-pointer"
    >
      {/* Icon */}
      <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-background rounded-md border border-border/50">
        <Building2 className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className="text-[14px] font-semibold text-foreground truncate"
              data-testid={`text-org-name-${org.id}`}
            >
              {org.name}
            </span>
            <span className="text-[12px] text-muted-foreground truncate">{org.slug}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                Ver detalle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[11px] px-1.5 py-0 h-5 ${isActive ? "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10" : ""}`}
          >
            {isActive ? "ACTIVE" : org.status?.toUpperCase()}
          </Badge>
          {stats && (
            <>
              {stats.bridges_count !== undefined && (
                <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 font-mono">
                  {stats.bridges_count} bridges
                </Badge>
              )}
              {stats.machines_count !== undefined && (
                <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 font-mono">
                  {stats.machines_count} máq.
                </Badge>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
