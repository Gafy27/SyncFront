import { useState } from "react";
import { Plus, Building2, Users, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockOrganizations = [
  {
    id: "1",
    name: "Autentio Manufacturing",
    description: "Planta principal de manufactura",
    applications: 12,
    users: 45,
    gateways: 8,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Autentio Logistics",
    description: "Centro de distribución",
    applications: 6,
    users: 23,
    gateways: 4,
    createdAt: "2024-02-20",
  },
];

export default function Organizations() {
  const [organizations] = useState(mockOrganizations);

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
          <p className="text-muted-foreground">
            Gestiona las organizaciones y sus recursos
          </p>
        </div>
        <Button data-testid="button-add-organization">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Organización
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {organizations.map((org) => (
          <Card key={org.id} className="hover-elevate cursor-pointer" data-testid={`card-organization-${org.id}`}>
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
                      {org.description}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Activa
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-semibold" data-testid={`text-app-count-${org.id}`}>
                    {org.applications}
                  </div>
                  <div className="text-xs text-muted-foreground">Aplicaciones</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div className="text-2xl font-semibold">{org.users}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Usuarios</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <Radio className="w-4 h-4 text-muted-foreground" />
                    <div className="text-2xl font-semibold">{org.gateways}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Gateways</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
