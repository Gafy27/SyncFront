import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  status?: "active" | "inactive";
}

interface UsersTableProps {
  users: UserInfo[];
}

export function UsersTable({ users }: UsersTableProps) {
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
      <CardContent>
        <div className="overflow-x-auto pt-6">
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
                  <TableCell colSpan={4} className="text-center py-8">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(user.status || "active") === "active" ? "default" : "secondary"}>
                        {(user.status || "active").toUpperCase()}
                      </Badge>
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
