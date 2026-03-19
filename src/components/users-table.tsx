import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, User as UserIcon } from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  status?: "active" | "inactive";
}

interface UsersTableProps {
  users: UserInfo[];
  onDelete?: (userId: string) => void;
}

export function UsersTable({ users, onDelete }: UsersTableProps) {
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
    <div className="overflow-x-auto" data-testid="card-users-table">
      <Table className="border-none">
        <TableHeader className="[&_tr]:border-none">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Usuario</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Rol</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide text-right pr-4">Estado</TableHead>
            <TableHead className="w-10 h-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow className="hover:bg-transparent border-none">
              <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                No hay usuarios registrados
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.id}
                className="group border-none hover:bg-muted/30 transition-colors cursor-pointer"
              >

                <TableCell className="py-3 align-top">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {user.name}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 align-top">
                  <Badge variant="secondary" className="text-[12px] font-normal uppercase tracking-wider px-1.5 py-0">
                    {getRoleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-right pr-4 align-top">
                  <Badge
                    variant={(user.status || "active") === "active" ? "default" : "secondary"}
                    className={(user.status || "active") === "active" ? "bg-green-100 text-green-700 hover:bg-green-100 text-[11px] px-1.5 py-0" : "text-[11px] px-1.5 py-0"}
                  >
                    {(user.status || "active").toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-right align-top">
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`¿Eliminar usuario "${user.name}"?`)) return;
                        onDelete(user.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

