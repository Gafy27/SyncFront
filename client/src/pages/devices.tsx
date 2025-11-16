import { useState } from "react";
import { Plus, Search, MoreVertical, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockDevices = [
  { id: "CNC003", name: "CNC Machine 003", type: "CNC", status: "active" as const, lastSeen: "Hace 2 minutos", gateway: "GATE-12" },
  { id: "CNC005", name: "CNC Machine 005", type: "CNC", status: "active" as const, lastSeen: "Hace 3 minutos", gateway: "GATE-09" },
  { id: "NODE-8821", name: "Sensor Node 8821", type: "Sensor", status: "active" as const, lastSeen: "Hace 5 minutos", gateway: "GATE-07" },
  { id: "SENSOR-102", name: "Temperature Sensor 102", type: "Sensor", status: "active" as const, lastSeen: "Hace 1 minuto", gateway: "GATE-12" },
  { id: "ARM-001", name: "Robotic Arm 001", type: "Robot", status: "inactive" as const, lastSeen: "Hace 2 horas", gateway: "GATE-03" },
  { id: "CAM-045", name: "Vision Camera 045", type: "Camera", status: "active" as const, lastSeen: "Hace 30 segundos", gateway: "GATE-05" },
];

export default function Devices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredDevices = mockDevices.filter(device => 
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Dispositivos</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Dispositivos</h1>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-device">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Dispositivo
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar dispositivos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-devices"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => (
          <Card key={device.id} className="hover-elevate" data-testid={`card-device-${device.id}`}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex-1">
                <p className="text-sm font-mono text-muted-foreground mb-1">{device.id}</p>
                <h3 className="font-semibold" data-testid={`text-device-name-${device.id}`}>{device.name}</h3>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-menu-${device.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem data-testid={`button-edit-${device.id}`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" data-testid={`button-delete-${device.id}`}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <span className="text-sm font-medium">{device.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <StatusBadge status={device.status} testId={`badge-status-${device.id}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Última vez:</span>
                  <span className="text-sm">{device.lastSeen}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Gateway:</span>
                  <span className="text-sm font-mono">{device.gateway}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-device">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Dispositivo</DialogTitle>
            <DialogDescription>
              Configure los detalles del nuevo dispositivo IoT
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="device-id">ID del Dispositivo</Label>
              <Input id="device-id" placeholder="DEVICE-001" data-testid="input-device-id" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-name">Nombre</Label>
              <Input id="device-name" placeholder="Mi Dispositivo" data-testid="input-device-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-type">Tipo</Label>
              <Select>
                <SelectTrigger id="device-type" data-testid="select-device-type">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sensor">Sensor</SelectItem>
                  <SelectItem value="cnc">CNC</SelectItem>
                  <SelectItem value="robot">Robot</SelectItem>
                  <SelectItem value="camera">Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-gateway">Gateway</Label>
              <Select>
                <SelectTrigger id="device-gateway" data-testid="select-device-gateway">
                  <SelectValue placeholder="Seleccionar gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gate-01">GATE-01</SelectItem>
                  <SelectItem value="gate-02">GATE-02</SelectItem>
                  <SelectItem value="gate-03">GATE-03</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button onClick={() => {
              console.log("Dispositivo agregado");
              setIsAddDialogOpen(false);
            }} data-testid="button-save-device">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
