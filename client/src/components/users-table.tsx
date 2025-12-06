import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  status?: "active" | "inactive";
}

interface UsersTableProps {
  users: User[];
}

export function UsersTable({ users }: UsersTableProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700";
      case "user":
        return "bg-blue-100 text-blue-700";
      case "viewer":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "user":
        return "Usuario";
      case "viewer":
        return "Visualizador";
      default:
        return role;
    }
  };

  return (
    <Card data-testid="card-users-table">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Usuarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase">Nombre</TableHead>
                <TableHead className="text-xs font-medium uppercase">Email</TableHead>
                <TableHead className="text-xs font-medium uppercase">Rol</TableHead>
                <TableHead className="text-xs font-medium uppercase">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow 
                    key={user.id} 
                    data-testid={`row-user-${user.id}`}
                  >
                    <TableCell className="text-sm font-medium" data-testid={`text-user-name-${user.id}`}>
                      {user.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        variant="default"
                        className={getRoleBadgeColor(user.role)}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        (user.status || "active") === "active" 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {(user.status || "active") === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

