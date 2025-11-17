import { useState } from "react";
import { Plus, Mail, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mockUsers = [
  {
    id: "1",
    name: "Juan Pérez",
    email: "juan.perez@autentio.com",
    role: "Admin",
    organization: "Autentio Manufacturing",
    status: "active",
  },
  {
    id: "2",
    name: "María González",
    email: "maria.gonzalez@autentio.com",
    role: "Operador",
    organization: "Autentio Manufacturing",
    status: "active",
  },
  {
    id: "3",
    name: "Carlos Rodríguez",
    email: "carlos.rodriguez@autentio.com",
    role: "Supervisor",
    organization: "Autentio Logistics",
    status: "inactive",
  },
];

export default function Users() {
  const [users] = useState(mockUsers);

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Usuarios</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
            Usuarios
          </h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios de la plataforma
          </p>
        </div>
        <Button data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold" data-testid={`text-user-name-${user.id}`}>
                      {user.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {user.organization}
                  </div>
                  <Badge 
                    variant={user.status === "active" ? "default" : "secondary"}
                    className={user.status === "active" 
                      ? "bg-green-100 text-green-700 border-green-200" 
                      : ""}
                    data-testid={`badge-status-${user.id}`}
                  >
                    {user.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
