import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Users as UsersIcon, Settings, Save, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsersTable } from "@/components/users-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  status?: "active" | "inactive";
  createdAt?: string;
};

type Organization = {
  id: string;
  name: string;
  description?: string;
  email?: string;
  website?: string;
};

export default function OrganizationDetail() {
  const [, params] = useRoute<{ orgId: string }>("/organizations/:orgId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const orgId = params?.orgId;

  // Fetch organization data
  const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: [`/api/organizations/${orgId}`],
    enabled: !!orgId,
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: [`/api/organizations/${orgId}/users`],
    enabled: !!orgId,
  });

  // Organization settings state
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");

  // Add user dialog state
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "user" | "viewer",
  });

  // Initialize form when organization data loads
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || "");
      setOrgDescription(organization.description || "");
      setOrgEmail(organization.email || "");
      setOrgWebsite(organization.website || "");
    }
  }, [organization]);

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: Partial<Organization>) => {
      const res = await apiRequest(
        'PUT',
        `/api/organizations/${orgId}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}`] });
      toast({ title: "Éxito", description: "Configuración guardada correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveSettings = () => {
    updateOrgMutation.mutate({
      name: orgName.trim() || undefined,
      description: orgDescription.trim() || undefined,
      email: orgEmail.trim() || undefined,
      website: orgWebsite.trim() || undefined,
    });
  };

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; role: string }) => {
      const res = await apiRequest(
        'POST',
        `/api/organizations/${orgId}/users`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/users`] });
      setIsAddUserDialogOpen(false);
      setNewUser({ name: "", email: "", role: "user" });
      toast({ title: "Éxito", description: "Usuario agregado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleAddUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      });
      return;
    }
    addUserMutation.mutate({
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      role: newUser.role,
    });
  };

  if (!orgId) {
    return (
      <div className="p-10">
        <p>Organización no encontrada</p>
      </div>
    );
  }

  if (orgLoading) {
    return (
      <div className="p-10">
        <p>Cargando organización...</p>
      </div>
    );
  }

  return (
    <div className="p-10">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/organizations")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold mb-1">
            {organization?.name || orgId}
          </h1>
          <p className="text-muted-foreground">ID: {orgId}</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users">
            <UsersIcon className="w-4 h-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsAddUserDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Usuario
              </Button>
            </div>
            <UsersTable users={usersLoading ? [] : users} />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de la Organización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Nombre de la Organización</Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Nombre de la organización"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-email">Email de Contacto</Label>
                  <Input
                    id="org-email"
                    type="email"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="contacto@organizacion.com"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="org-description">Descripción</Label>
                  <Input
                    id="org-description"
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    placeholder="Descripción de la organización"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-website">Sitio Web</Label>
                  <Input
                    id="org-website"
                    type="url"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://organizacion.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-id">ID de Organización</Label>
                  <Input
                    id="org-id"
                    value={orgId}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSettings} disabled={updateOrgMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateOrgMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Agregue un nuevo usuario a la organización
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nombre</Label>
              <Input
                id="user-name"
                placeholder="Nombre completo"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="usuario@email.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Rol</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: "admin" | "user" | "viewer") =>
                  setNewUser({ ...newUser, role: value })
                }
              >
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddUserDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddUser} disabled={addUserMutation.isPending}>
                {addUserMutation.isPending ? "Agregando..." : "Agregar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

