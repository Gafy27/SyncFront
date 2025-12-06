import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";

interface Application {
  applicationId: string;
  name: string;
  description?: string;
  status?: string;
  deviceCount?: number;
}

interface ApplicationsTableProps {
  applications: Application[];
}

export function ApplicationsTable({ applications }: ApplicationsTableProps) {
  const [, setLocation] = useLocation();

  const handleRowClick = (appId: string) => {
    setLocation(`/applications?app=${appId}`);
  };

  return (
    <Card data-testid="card-applications-table">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Aplicaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase">Nombre</TableHead>
                <TableHead className="text-xs font-medium uppercase">Estado</TableHead>
                <TableHead className="text-xs font-medium uppercase">Dispositivos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No hay aplicaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow 
                    key={app.applicationId} 
                    className="hover-elevate cursor-pointer" 
                    onClick={() => handleRowClick(app.applicationId)}
                    data-testid={`row-application-${app.applicationId}`}
                  >
                    <TableCell className="text-sm font-medium" data-testid={`text-app-name-${app.applicationId}`}>
                      {app.name || app.applicationId}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        app.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {app.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{app.deviceCount || 0}</TableCell>
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

