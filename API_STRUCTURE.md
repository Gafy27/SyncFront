# SyncCore API Structure

## Multi-Tenant Architecture

### Database Layout

**Global Database** (`instance_config`):
- `organizations` - Organization records
- `users` - User records (linked to organizations)
- `user_organizations` - User ↔ Organization membership
- `services` - Global service configurations
- `connector_templates` - Connector driver templates (schema/variables)

**Tenant Databases** (`org_{organization_id}`):
- `bridges` - Configured connection instances (MQTT broker, OPC-UA server, etc.)
- `machines` - Machine/device records
- `event_classes` - Event type definitions
- `workflows` - Streaming and batch processing workflows
- `workflow_tables` - Tables computed by batch workflows

## API Routes

### Global Resources

#### Organizations
```
GET    /api/organizations
POST   /api/organizations
GET    /api/organizations/{org_id}
PUT    /api/organizations/{org_id}
DELETE /api/organizations/{org_id}
GET    /api/organizations/{org_id}/stats
```

#### Services (Global)
```
GET    /api/services
POST   /api/services
GET    /api/services/{service_id}
PUT    /api/services/{service_id}
DELETE /api/services/{service_id}
```

#### Connector Templates (Global)
```
GET    /api/connector-templates
POST   /api/connector-templates
GET    /api/connector-templates/{template_id}
PUT    /api/connector-templates/{template_id}
DELETE /api/connector-templates/{template_id}
```

### Organization-Level Resources

#### Users
```
GET    /api/organizations/{org_id}/users
POST   /api/organizations/{org_id}/users
GET    /api/organizations/{org_id}/users/{user_id}
PUT    /api/organizations/{org_id}/users/{user_id}
DELETE /api/organizations/{org_id}/users/{user_id}
```

#### Bridges
```
GET    /api/organizations/{org_id}/bridges
POST   /api/organizations/{org_id}/bridges
GET    /api/organizations/{org_id}/bridges/{bridge_id}
PUT    /api/organizations/{org_id}/bridges/{bridge_id}
DELETE /api/organizations/{org_id}/bridges/{bridge_id}
```

#### Machines
```
GET    /api/organizations/{org_id}/machines
POST   /api/organizations/{org_id}/machines
GET    /api/organizations/{org_id}/machines/{machine_id}
PUT    /api/organizations/{org_id}/machines/{machine_id}
DELETE /api/organizations/{org_id}/machines/{machine_id}
```

#### Events
```
GET    /api/organizations/{org_id}/events
POST   /api/organizations/{org_id}/events
PUT    /api/organizations/{org_id}/events           (bulk replace)
GET    /api/organizations/{org_id}/events/{event_id}
PUT    /api/organizations/{org_id}/events/{event_id}
DELETE /api/organizations/{org_id}/events/{event_id}
```

#### Workflows (Streaming + Batch)
```
GET    /api/organizations/{org_id}/workflows
POST   /api/organizations/{org_id}/workflows
GET    /api/organizations/{org_id}/workflows/{workflow_id}
PUT    /api/organizations/{org_id}/workflows/{workflow_id}
DELETE /api/organizations/{org_id}/workflows/{workflow_id}
```

#### Workflow Tables (Batch only)
```
GET    /api/organizations/{org_id}/workflows/{workflow_id}/tables
POST   /api/organizations/{org_id}/workflows/{workflow_id}/tables
GET    /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
PUT    /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
DELETE /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
```

## Key Concepts

### Streaming vs Batch Workflows

Both types are stored in the same `workflows` table and served from the same
`/workflows` routes, discriminated by the `type` field.

**Streaming** (`type: "streaming"`, real-time):
- Triggered by named events (e.g., `"power"`, `"temperature"`)
- Contains `tables`: ordered SQL/Python steps applied to each incoming event
- Execution: QuixStreams (continuous)

**Batch** (`type: "batch"`, windowed):
- Triggered by a window schedule (tumbling, sliding, stepping)
- Contains `tables`: SQL/Python aggregation steps stored as DB tables
- Execution: Temporal workflows

### Bridges vs Connector Templates

**ConnectorTemplate** (global, schema only):
- Defines the *available configuration variables* for a bridge type
- Shared across all organizations
- Examples: "OPC-UA Driver", "MQTT Broker", "InfluxDB"

**Bridge** (org-scoped, configured instance):
- A concrete connection with actual values (host, port, credentials, etc.)
- Belongs to one organization
- Referenced by machines via `bridges: list[str]` (by name)
- Optionally links back to the template that defines its schema

### Machines and Events

Machines and Events are now scoped directly to an Organization (no intermediate
application layer). A Machine references the bridges it uses and the event names
it can emit, both as plain string lists.

```json
{
  "name": "CNC Lathe #1",
  "bridges": ["opcua-main", "mqtt-plant-floor"],
  "events": ["power", "spindle_speed", "temperature"]
}
```

### Multi-Tenancy Model

1. **Organization Creation**:
   - Creates record in global `organizations` table
   - Creates new PostgreSQL database: `org_{organization_id}`
   - Initializes all tenant tables in the new database

2. **Data Access**:
   - Global resources: always use global database
   - Tenant resources: `org_id` determines which database
   - API automatically routes to the correct database

3. **Data Isolation**:
   - Each organization's data is in a separate database
   - No cross-tenant data leakage

## Example Usage

### Create Organization
```bash
POST /api/organizations
{
  "name": "Acme Manufacturing",
  "slug": "acme",
  "status": "active"
}
```

### Create a Bridge
```bash
POST /api/organizations/{org_id}/bridges
{
  "name": "opcua-main",
  "type": "opcua",
  "config": {
    "host": "192.168.1.5",
    "port": 4840
  },
  "template_id": "{template_id}"
}
```

### Create a Machine
```bash
POST /api/organizations/{org_id}/machines
{
  "name": "CNC Lathe #1",
  "bridges": ["opcua-main"],
  "events": ["power", "spindle_speed"]
}
```

### Create an Event
```bash
POST /api/organizations/{org_id}/events
{
  "event": "power",
  "conter": "false",
  "authenticate":"false"
  "remove_duplicates":true"
  "type": "FLOAT",
  "values_range": [0, 200]
}
```

### Create a Streaming Workflow
```bash
POST /api/organizations/{org_id}/workflows
{
  "name": "Power Monitoring",
  "type": "streaming",
  "triggers": ["power"],
  "tables": [
    {
      "type": "sql",
      "definition": "SELECT value * 1.5 AS adjusted_power FROM power",
      "publish": true
    }
  ]
}
```

### Create a Batch Workflow
```bash
POST /api/organizations/{org_id}/workflows
{
  "name": "OEE Calculation",
  "type": "batch",
  "window": {
    "type": "tumbling",
    "size": "30m"
  },
  "tables": [
    {
      "name": "availability",
      "upsert_constrains": ["batch_id", "machine_id"],
      "function": {
        "type": "sql",
        "definition": "SELECT batch_id, machine_id, SUM(duration) AS uptime FROM events GROUP BY batch_id, machine_id"
      },
      "order": 0
    }
  ]
}
```

## Development

### Running the API
```bash
poetry run python api/main.py
```

### Seeding Test Data
```bash
poetry run python api/test/fast.py
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:8001/status

# List organizations
curl http://localhost:8001/api/organizations

# List bridges for an org
curl http://localhost:8001/api/organizations/{org_id}/bridges

# List machines for an org
curl http://localhost:8001/api/organizations/{org_id}/machines

# List workflows for an org
curl http://localhost:8001/api/organizations/{org_id}/workflows
```

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         GLOBAL LAYER                                   │
│  (Database: "instance_config")                                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │   organizations  │  │      users       │  │ user_organizations │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐   │
│  │  connector_templates    │  │         services                 │   │
│  │  (driver schemas)       │  │  (MQTT, Temporal, Auth, ...)     │   │
│  └─────────────────────────┘  └──────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
┌─────────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│   TENANT: Acme Mfg      │ │  TENANT: GlobalTech  │ │  TENANT: FactoryX    │
│   DB: org_acme_uuid     │ │  DB: org_global_uuid │ │  DB: org_factory_uuid│
├─────────────────────────┤ ├──────────────────────┤ ├──────────────────────┤
│                         │ │                      │ │                      │
│  bridges                │ │  bridges             │ │  bridges             │
│  - opcua-main           │ │  - mqtt-qa           │ │  - modbus-plc        │
│  - mqtt-plant-floor     │ │  - influx-historian  │ │                      │
│                         │ │                      │ │                      │
│  machines               │ │  machines            │ │  machines            │
│  - CNC Lathe #1         │ │  - Inspection A1     │ │  - Robot Arm #5      │
│  - CNC Mill #2          │ │  - QC Station #3     │ │  - Conveyor #12      │
│                         │ │                      │ │                      │
│  event_classes          │ │  event_classes       │ │  event_classes       │
│  workflows              │ │  workflows           │ │  workflows           │
│  workflow_tables        │ │  workflow_tables     │ │  workflow_tables     │
│                         │ │                      │ │                      │
└─────────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

## Database Naming Convention

### Global Database
```
Name: From config (e.g., "instance_config", "synccore_global")
      Set in config/internal_bridge.yml
```

### Tenant Databases
```
Format: org_{sanitized_organization_id}

Example:
  Organization ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Database name:   org_a1b2c3d4_e5f6_7890_abcd_ef1234567890
                       ↑
                       Hyphens replaced with underscores
```
