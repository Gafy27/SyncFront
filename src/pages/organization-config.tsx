import { useState, useEffect } from "react";
import { Users as UsersIcon, Settings, Save, Plus, Building2 } from "lucide-react";
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
import { useOrganization } from "@/providers/organization-provider";
import { queryClient } from "@/lib/queryClient";
import { organizations as orgsApi, orgUsers as orgUsersApi } from "@/lib/api";

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

export default function OrganizationConfig() {
    const { selectedOrg } = useOrganization();
    const { toast } = useToast();

    const orgId = selectedOrg;

    // Fetch organization data
    const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
        queryKey: ["organizations", orgId],
        queryFn: () => orgsApi.get(orgId!),
        enabled: !!orgId,
    });

    // Fetch users
    const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
        queryKey: ["organizations", orgId, "users"],
        queryFn: async () => {
            const res = await orgUsersApi.list(orgId!);
            if (Array.isArray(res)) return res as User[];
            if (res && typeof res === "object") {
                const o = res as Record<string, unknown>;
                const key = Object.keys(o).find((k) => Array.isArray(o[k]));
                if (key) return o[key] as User[];
            }
            return [];
        },
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
        mutationFn: (data: Partial<Organization>) => orgsApi.update(orgId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations", orgId] });
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
        mutationFn: (data: { name: string; email: string; role: string }) =>
            orgUsersApi.create(orgId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations", orgId, "users"] });
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

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: (userId: string) => orgUsersApi.delete(orgId!, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations", orgId, "users"] });
            toast({ title: "Éxito", description: "Usuario eliminado correctamente" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    if (!orgId) {
        return (
            <div className="p-10">
                <p className="text-muted-foreground">Selecciona una organización para configurar.</p>
            </div>
        );
    }

    if (orgLoading) {
        return (
            <div className="p-10">
                <p className="text-muted-foreground text-sm">Cargando organización...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Configuración de {organization?.name || orgId}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Possible save button shortcut? Nah, stays in general tab for now. */}
                </div>
            </div>

            <div className="p-6 overflow-auto no-scrollbar">
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="bg-muted/40 p-1 rounded-lg inline-flex mb-6">
                        <TabsTrigger value="general" className="flex items-center gap-2 px-6 py-1.5 transition-all text-xs font-medium">
                            <Settings className="w-3.5 h-3.5" />
                            General
                        </TabsTrigger>
                        <TabsTrigger value="users" className="flex items-center gap-2 px-6 py-1.5 transition-all text-xs font-medium">
                            <UsersIcon className="w-3.5 h-3.5" />
                            Usuarios
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-0">
                        <div className="max-w-3xl space-y-4">
                            <div className="p-6 rounded-lg bg-muted/20 border border-border/50">
                                <h3 className="text-sm font-semibold mb-4">Información de la Organización</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="org-name" className="text-[11px] uppercase tracking-wider text-muted-foreground">Nombre</Label>
                                        <Input
                                            id="org-name"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="org-email" className="text-[11px] uppercase tracking-wider text-muted-foreground">Email de Contacto</Label>
                                        <Input
                                            id="org-email"
                                            type="email"
                                            value={orgEmail}
                                            onChange={(e) => setOrgEmail(e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="org-description" className="text-[11px] uppercase tracking-wider text-muted-foreground">Descripción</Label>
                                        <Input
                                            id="org-description"
                                            value={orgDescription}
                                            onChange={(e) => setOrgDescription(e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="org-website" className="text-[11px] uppercase tracking-wider text-muted-foreground">Sitio Web</Label>
                                        <Input
                                            id="org-website"
                                            type="url"
                                            value={orgWebsite}
                                            onChange={(e) => setOrgWebsite(e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="org-id" className="text-[11px] uppercase tracking-wider text-muted-foreground">ID de Organización</Label>
                                        <Input
                                            id="org-id"
                                            value={orgId}
                                            disabled
                                            className="bg-muted/50 h-9 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-6">
                                    <Button onClick={handleSaveSettings} disabled={updateOrgMutation.isPending} size="sm">
                                        <Save className="w-3.5 h-3.5 mr-2" />
                                        {updateOrgMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="mt-0">
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <Button size="sm" onClick={() => setIsAddUserDialogOpen(true)}>
                                    <Plus className="w-3.5 h-3.5 mr-2" />
                                    Agregar Usuario
                                </Button>
                            </div>
                            <UsersTable
                                users={usersLoading ? [] : users}
                                onDelete={(id) => deleteUserMutation.mutate(id)}
                            />
                        </div>
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
        </div>
    );
}
