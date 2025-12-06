import { Plus, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface Organization {
  id: string;
  name: string;
  sizeOnDisk?: number;
  empty?: boolean;
  applicationCount?: number;
  userCount?: number;
}

export default function Organizations() {
  const [, setLocation] = useLocation();
  const { data: organizations = [], isLoading, error } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
  });

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Organizaciones</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
            Organizaciones
          </h1>
        </div>
        <Button data-testid="button-add-organization">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Organización
        </Button>
      </div>

      {isLoading && (
        <div className="text-muted-foreground mb-4">Cargando organizaciones...</div>
      )}

      {error && (
        <div className="text-destructive mb-4">No se pudieron cargar las organizaciones.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {organizations.map((org) => (
          <Card key={org.id} className="hover-elevate cursor-pointer" data-testid={`card-organization-${org.id}`} onClick={() => setLocation(`/organizations/${org.id}`)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-org-name-${org.id}`}>
                      {org.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Base de datos MongoDB
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Activa
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-semibold" data-testid={`text-app-count-${org.id}`}>
                    {org.applicationCount ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Aplicaciones</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-semibold" data-testid={`text-user-count-${org.id}`}>
                    {org.userCount ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Usuarios</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
