import { Settings, Users, Shield, Database, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Admin() {
  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Administración</span>
      </div>

      <h1 className="text-3xl font-semibold mb-8" data-testid="text-page-title">Administración</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>Ajustes del sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync">Sincronización Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronizar dispositivos cada 5 minutos
                </p>
              </div>
              <Switch id="auto-sync" defaultChecked data-testid="switch-auto-sync" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="real-time">Actualizaciones en Tiempo Real</Label>
                <p className="text-sm text-muted-foreground">
                  WebSocket para datos en vivo
                </p>
              </div>
              <Switch id="real-time" defaultChecked data-testid="switch-real-time" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">Analíticas Avanzadas</Label>
                <p className="text-sm text-muted-foreground">
                  Recopilar métricas detalladas
                </p>
              </div>
              <Switch id="analytics" defaultChecked data-testid="switch-analytics" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-md">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Gestión de alertas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-alerts">Alertas por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Recibir notificaciones críticas
                </p>
              </div>
              <Switch id="email-alerts" defaultChecked data-testid="switch-email-alerts" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="slack">Integración Slack</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar eventos a Slack
                </p>
              </div>
              <Switch id="slack" data-testid="switch-slack" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms">Alertas SMS</Label>
                <p className="text-sm text-muted-foreground">
                  SMS para fallos críticos
                </p>
              </div>
              <Switch id="sms" data-testid="switch-sms" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-md">
                <Users className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <CardTitle>Usuarios y Permisos</CardTitle>
                <CardDescription>Gestión de accesos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">Administradores</p>
                  <p className="text-sm text-muted-foreground">Acceso completo</p>
                </div>
                <span className="text-lg font-semibold">3</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">Operadores</p>
                  <p className="text-sm text-muted-foreground">Acceso de lectura/escritura</p>
                </div>
                <span className="text-lg font-semibold">12</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">Visualizadores</p>
                  <p className="text-sm text-muted-foreground">Solo lectura</p>
                </div>
                <span className="text-lg font-semibold">8</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-md">
                <Database className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <CardTitle>Base de Datos</CardTitle>
                <CardDescription>Estado y métricas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tamaño total</span>
                <span className="text-sm font-medium">2.4 GB</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Eventos almacenados</span>
                <span className="text-sm font-medium">1,245,678</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Último backup</span>
                <span className="text-sm font-medium">Hace 6 horas</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado</span>
                <span className="text-sm font-medium text-green-600">Operativo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
