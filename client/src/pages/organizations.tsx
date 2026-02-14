import { Plus, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newOrgName.trim()) return;
    createMutation.mutate({
      name: newOrgName.trim(),
      slug:
        newOrgSlug.trim() ||
        newOrgName.trim().toLowerCase().replace(/\s+/g, "-"),
      status: "active",
    });
  };

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Organizaciones</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1
          className="text-3xl font-semibold"
          data-testid="text-page-title"
        >
          Organizaciones
        </h1>
        <Button
          data-testid="button-add-organization"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Organizacion
        </Button>
      </div>

      {isLoading && (
        <div className="text-muted-foreground mb-4">
          Cargando organizaciones...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {organizations.map((org) => (
          <OrgCard
            key={org.id}
            org={org}
            onClick={() => setLocation(`/organizations/${org.id}`)}
          />
        ))}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Organizacion</DialogTitle>
            <DialogDescription>
              Cree una nueva organizacion para su equipo
            </DialogDescription>
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
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creando..." : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrgCard({
  org,
  onClick,
}: {
  org: Organization;
  onClick: () => void;
}) {
  // Fetch org stats (optional - won't crash if endpoint doesn't exist)
  const { data: stats } = useQuery<OrgStats>({
    queryKey: ["org-stats", org.id],
    queryFn: () => orgsApi.stats(org.id),
    retry: false,
  });

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      data-testid={`card-organization-${org.id}`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle
                className="text-lg"
                data-testid={`text-org-name-${org.id}`}
              >
                {org.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {org.slug}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={
              org.status === "active"
                ? "bg-green-100 text-green-700 border-green-200"
                : ""
            }
          >
            {org.status === "active" ? "Activa" : org.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-semibold">
              {stats?.applications_count ?? "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              Aplicaciones
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold">
              {stats?.machines_count ?? "-"}
            </div>
            <div className="text-xs text-muted-foreground">Maquinas</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold">
              {stats?.gateways_count ?? "-"}
            </div>
            <div className="text-xs text-muted-foreground">Gateways</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
