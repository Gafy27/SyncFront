import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import rockwellLogo from "@assets/image_1763374687620.png";
import abbLogo from "@assets/image_1763374691784.png";
import urLogo from "@assets/image_1763374694281.png";
import yaskawaLogo from "@assets/image_1763374696992.png";
import kukaLogo from "@assets/image_1763374699984.png";
import siemensLogo from "@assets/image_1763374701698.png";
import okumaLogo from "@assets/image_1763374704682.png";
import mqttLogo from "@assets/image_1763374706458.png";
import moriLogo from "@assets/image_1763374710638.png";
import modbusLogo from "@assets/image_1763374713069.png";
import mazakLogo from "@assets/image_1763374716014.png";
import loraLogo from "@assets/image_1763374719130.png";
import haasLogo from "@assets/image_1763374721742.png";
import fanucLogo from "@assets/image_1763374725354.png";

const connectors = [
  { id: "fanuc", name: "FANUC", logo: fanucLogo, status: "connected", protocol: "CNC Protocol" },
  { id: "haas", name: "HAAS", logo: haasLogo, status: "connected", protocol: "CNC Protocol" },
  { id: "siemens", name: "Siemens", logo: siemensLogo, status: "connected", protocol: "PLC Protocol" },
  { id: "abb", name: "ABB", logo: abbLogo, status: "connected", protocol: "Robot Controller" },
  { id: "mazak", name: "Mazak", logo: mazakLogo, status: "connected", protocol: "Machine Tool" },
  { id: "mqtt", name: "MQTT", logo: mqttLogo, status: "connected", protocol: "IoT Protocol" },
  { id: "modbus", name: "Modbus", logo: modbusLogo, status: "connected", protocol: "Industrial Protocol" },
  { id: "lora", name: "LoRa", logo: loraLogo, status: "connected", protocol: "Wireless Protocol" },
  { id: "dmg-mori", name: "DMG MORI", logo: moriLogo, status: "disconnected", protocol: "CNC Protocol" },
  { id: "okuma", name: "Okuma", logo: okumaLogo, status: "connected", protocol: "CNC Protocol" },
  { id: "kuka", name: "KUKA", logo: kukaLogo, status: "connected", protocol: "Robot Controller" },
  { id: "yaskawa", name: "Yaskawa", logo: yaskawaLogo, status: "connected", protocol: "Motion Control" },
  { id: "universal-robots", name: "Universal Robots", logo: urLogo, status: "connected", protocol: "Cobot Controller" },
  { id: "rockwell", name: "Rockwell Automation", logo: rockwellLogo, status: "disconnected", protocol: "PLC Protocol" },
];

export default function Connectors() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConnectors = connectors.filter(connector => 
    connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connector.protocol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10">
      <div className="text-sm text-muted-foreground mb-6">
        SYNC / <span className="text-foreground">Conectores</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Conectores</h1>
          <p className="text-muted-foreground">
            Conectores industriales disponibles para integración IoT y robótica
          </p>
        </div>
        <Button data-testid="button-add-connector">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Conector
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conectores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-connectors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredConnectors.map((connector) => (
          <Card key={connector.id} className="hover-elevate" data-testid={`card-connector-${connector.id}`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-full h-20 flex items-center justify-center">
                  <img 
                    src={connector.logo} 
                    alt={connector.name} 
                    className="max-w-full max-h-full object-contain"
                    data-testid={`img-logo-${connector.id}`}
                  />
                </div>
                <div className="w-full space-y-2">
                  <h3 className="font-semibold text-sm" data-testid={`text-connector-name-${connector.id}`}>
                    {connector.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{connector.protocol}</p>
                </div>
                <Badge 
                  variant={connector.status === "connected" ? "default" : "secondary"}
                  className={connector.status === "connected" 
                    ? "bg-green-100 text-green-700 border-green-200" 
                    : "bg-gray-100 text-gray-700 border-gray-200"}
                  data-testid={`badge-status-${connector.id}`}
                >
                  {connector.status === "connected" ? "Conectado" : "Desconectado"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card 
          className="border-2 border-dashed hover-elevate cursor-pointer" 
          data-testid="card-add-connector"
        >
          <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Agregar Conector
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
