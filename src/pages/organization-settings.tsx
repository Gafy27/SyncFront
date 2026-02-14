import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Save, Plus, X, UserPlus, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type User = {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user" | "viewer";
    status: "active" | "inactive";
};

export default function OrganizationSettings() {
    const [, params] = useRoute<{ orgId: string }>("/organizations/:orgId/settings");
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const orgId = params?.orgId || "autentiodev";

    // Organization settings state
    const [orgName, setOrgName] = useState("Autentio Dev");
    const [orgDescription, setOrgDescription] = useState("Development organization for Autentio");
    const [orgWebsite, setOrgWebsite] = useState("https://autentio.com");
    const [orgEmail, setOrgEmail] = useState("dev@autentio.com");

    // Users state
    const [users, setUsers] = useState<User[]>([
        { id: "1", name: "Admin User", email: "admin@autentio.com", role: "admin", status: "active" },
        { id: "2", name: "John Doe", email: "john@autentio.com", role: "user", status: "active" },
        { id: "3", name: "Jane Smith", email: "jane@autentio.com", role: "viewer", status: "active" },
    ]);

    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        role: "user" as "admin" | "user" | "viewer",
    });

    const handleSaveSettings = () => {
        toast({
            title: "Configuración guardada",
            description: "Los cambios se han guardado correctamente",
        });
    };

    const handleAddUser = () => {
        if (!newUser.name || !newUser.email) {
            toast({
                title: "Error",
                description: "Por favor complete todos los campos",
                variant: "destructive",
            });
            return;
        }

        const user: User = {
            id: Date.now().toString(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            status: "active",
        };

        setUsers([...users, user]);
        setNewUser({ name: "", email: "", role: "user" });

        toast({
            title: "Usuario agregado",
            description: `${user.name} ha sido agregado a la organización`,
        });
    };

    const handleRemoveUser = (userId: string) => {
        setUsers(users.filter(u => u.id !== userId));
        toast({
            title: "Usuario eliminado",
            description: "El usuario ha sido eliminado de la organización",
        });
    };

    const handleUpdateUserRole = (userId: string, role: "admin" | "user" | "viewer") => {
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
        toast({
            title: "Rol actualizado",
            description: "El rol del usuario ha sido actualizado",
        });
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "admin":
                return "bg-purple-100 text-purple-700 border-purple-200";
            case "user":
                return "bg-blue-100 text-blue-700 border-blue-200";
            case "viewer":
                return "bg-gray-100 text-gray-700 border-gray-200";
            default:
                return "";
        }
    };

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
                    <h1 className="text-3xl font-semibold mb-1">Configuración de Organización</h1>
                    <p className="text-muted-foreground">{orgName}</p>
                </div>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="general">
                        <Settings className="w-4 h-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="users">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Usuarios
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información General</CardTitle>
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

                            <Separator />

                            <div className="flex justify-end">
                                <Button onClick={handleSaveSettings}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Cambios
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agregar Nuevo Usuario</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="user-name">Nombre</Label>
                                    <Input
                                        id="user-name"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        placeholder="Nombre completo"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="user-email">Email</Label>
                                    <Input
                                        id="user-email"
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        placeholder="usuario@email.com"
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

                                <div className="flex items-end">
                                    <Button onClick={handleAddUser} className="w-full">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Agregar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Usuarios de la Organización</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={user.role}
                                                    onValueChange={(value: "admin" | "user" | "viewer") =>
                                                        handleUpdateUserRole(user.id, value)
                                                    }
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="user">Usuario</SelectItem>
                                                        <SelectItem value="viewer">Visualizador</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="default"
                                                    className={
                                                        user.status === "active"
                                                            ? "bg-green-100 text-green-700 border-green-200"
                                                            : "bg-gray-100 text-gray-700 border-gray-200"
                                                    }
                                                >
                                                    {user.status === "active" ? "Activo" : "Inactivo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveUser(user.id)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
