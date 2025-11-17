# Sync - Plataforma IoT/Robótica/IA (Autentio)

## Descripción General
Sync es una plataforma integral para conectar dispositivos IoT, máquinas y robots, crear flujos de datos para normalizar eventos, generar datasets para entrenar modelos de inteligencia artificial y comandar remotamente robots.

## Propósito del Proyecto
- Conectar dispositivos IoT, máquinas CNC y robots industriales
- Normalizar eventos de diferentes fuentes mediante clases de eventos
- Generar datasets de entrenamiento para modelos de IA
- Comandar robots remotamente
- Gestionar flujos de datos en tiempo real

## Arquitectura de la Plataforma

### Jerarquía Organizacional
```
Organización
├── Usuarios
├── Gateways
├── Edges
└── Aplicaciones
    └── Flujos
        ├── Máquinas
        ├── Conectores
        ├── Clases de Eventos
        └── Funciones
```

### Estructura de Datos

#### Organizaciones
- Agrupan usuarios, gateways, edges y aplicaciones
- Campos: id, name, description, createdAt

#### Aplicaciones
- Contienen flujos de datos específicos
- Campos: id, name, type, status, description, organizationId
- Sub-componentes:
  - **Máquinas**: Dispositivos conectados con eventos y propiedades
  - **Conectores**: Protocolos industriales (FANUC, Siemens, MQTT, Modbus, etc.)
  - **Clases de Eventos**: Definen tipos de eventos con autenticación y validación
  - **Funciones**: Procesamiento y transformación de datos

#### Máquinas
Estructura basada en JSON de configuración:
```json
{
  "machine_id": "24e124454e282635",
  "name": "CNC-001" (opcional),
  "events": [
    {
      "id": "adc_1",
      "label": "level_420" (opcional),
      "class": "adc_420"
    }
  ],
  "connectors": ["FANUC", "MQTT"],
  "properties": {
    "id_type": "EUI",
    "denomination": "Prueba Nodo Capsa 1",
    "max_tank_volume": 2500,
    "location": "PLANTA SUR"
  }
}
```

#### Clases de Eventos
Definen características de los eventos:
- `class`: Nombre de la clase (EXECUTION, MODE, adc_420, etc.)
- `topic`: Destino del evento (accepted, config, etc.)
- `type`: Tipo de dato (STR, FLOAT, INT)
- `auth_values`: Valores autorizados
- `values_range`: Rangos numéricos permitidos
- `contain_values`: Valores que deben estar contenidos

Ejemplos de clases:
- EXECUTION: Estados de ejecución (ACTIVE, STOPPED, etc.)
- MODE: Modos de operación (MANUAL, AUTOMATIC, etc.)
- adc_420: Señales analógicas 4-20mA
- ONLINE: Estado de conexión (TRUE, FALSE)

## Páginas de la Aplicación

### 1. Dashboard (`/`)
- KPIs principales de la plataforma
- Métricas en tiempo real
- Gráficas con Recharts

### 2. Organizaciones (`/organizations`)
- Lista de organizaciones
- Creación y gestión de organizaciones
- Vista de recursos por organización

### 3. Usuarios (`/users`)
- Gestión de usuarios del sistema
- Roles: Admin, Supervisor, Operador
- Asignación a organizaciones

### 4. Gateways (`/gateways`)
- Dispositivos de conexión IoT
- Estado de conexión
- Dispositivos conectados

### 5. Edges (`/edges`)
- Nodos de procesamiento distribuido
- Procesamiento en el borde (edge computing)
- Estado online/offline

### 6. Conectores (`/connectors`)
- 14 conectores industriales disponibles con logos oficiales de marca
- Protocolos: FANUC, HAAS, Siemens, ABB, Mazak, MQTT, Modbus, LoRa, DMG MORI, Okuma, KUKA, Yaskawa, Universal Robots, Rockwell Automation
- Estado: Conectado/Desconectado
- Búsqueda por nombre o protocolo
- Diseño tipo Litmus-Edge con tarjetas de logos

### 7. Aplicaciones (`/applications`)
- Vista de aplicaciones con métricas
- Al hacer clic: Tabs con flujos
  - **Máquinas**: Lista de máquinas con eventos (navegable a detalle)
  - **Conectores**: Grid de conectores vinculados al estilo Litmus-Edge con logos, protocolo y estado. Incluye botón para vincular nuevos conectores
  - **Clases de Eventos**: Definiciones de tipos de eventos
  - **Funciones**: Procesamiento de datos

### 8. Formulario de Máquina (`/machines/new`)
- **Información General**: ID de máquina, nombre opcional
- **Conectores**: Selección múltiple de protocolos
- **Eventos**: Array dinámico con:
  - ID del evento
  - Etiqueta (opcional)
  - Clase del evento (selector)
- **Propiedades**: Pares clave-valor dinámicos
- Botones: Añadir/Eliminar eventos y propiedades

### 9. Modelos IA (`/ai-models`)
- Gestión de modelos de inteligencia artificial
- Métricas de rendimiento

### 10. Administración (`/admin`)
- Configuración general del sistema

## Tecnologías

### Frontend
- React + TypeScript + Vite
- Wouter (routing)
- TanStack Query (data fetching)
- Shadcn UI + Tailwind CSS
- Recharts (gráficas)
- Lucide React (iconos)

### Backend (Mockup - NO FUNCIONAL)
- Express + TypeScript
- Drizzle ORM (esquemas definidos)
- In-memory storage (MemStorage)
- Todos los datos son mock/placeholder

### Design System
- **Colores Autentio**:
  - Cyan: #22D3EE
  - Blue: #60A5FA
  - Electric Blue: #0458EE
  - Navy: #0A1628
- **Tipografía**:
  - UI: Inter
  - Técnico/Máquinas: JetBrains Mono
- **Logo**: Sync blanco con auto-inversión para light/dark mode

## Archivos de Configuración (Referencia)

### bridge.yml
Configuración de conexiones: MQTT, Kafka, HTTP, Auth0, bases de datos (InfluxDB, TimescaleDB), Redis, topics

### class.yml
Definiciones de clases de eventos con sus características de validación

### service.yml
Servicios de la red: NetworkManager, MQTTBridgeService, StreamNormalizer, StreamInterpreter, Rewind

## Estado Actual
✅ Estructura jerárquica completa (Organizaciones → Aplicaciones → Flujos)
✅ Formulario completo de registro de máquinas
✅ 14 conectores industriales con logos oficiales actualizados
✅ Tab de conectores en aplicaciones con diseño tipo Litmus-Edge
✅ Sistema de clases de eventos
✅ Schema completo con todos los modelos
✅ Navegación actualizada
✅ Página de detalle de máquina con imagen de robot
✅ Logos de Sync actualizados (dark/light mode) - altura duplicada (96px)
✅ Dashboard mejorado con estadísticas de uso (sliders) y tabla de alarmas
✅ Gráficos de posición en tiempo real para robot Celda-01 (3 ejes: X, Y, Z)

## Notas de Desarrollo
- Este es un **mockup/prototipo** - NO hay funcionalidad backend real
- Todos los datos son de prueba (mock)
- Los comentarios `//todo` indican funcionalidad pendiente
- El foco está en la UI/UX y la estructura de datos
