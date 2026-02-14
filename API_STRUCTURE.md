# SyncCore API Structure

## Multi-Tenant Architecture

### Database Layout

**Global Database** (`instance_config`):
- `organizations` - Organization records
- `users` - User records (linked to organizations)
- `services` - Global service configurations
- `connector_templates` - Connector driver templates

**Tenant Databases** (`org_{organization_id}`):
- `applications` - Applications within the organization
- `gateways` - Edge gateways
- `machines` - Machine/device records
- `connectors` - Data connectors
- `event_classes` - Event type definitions
- `pipelines` - Streaming rule pipelines (real-time)
- `rules` - Rules within pipelines
- `workflows` - Batch processing workflows (Temporal)
- `workflow_tables` - Tables computed by workflows

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

### Organization-Level Resources

#### Users
```
GET    /api/organizations/{org_id}/users
POST   /api/organizations/{org_id}/users
GET    /api/organizations/{org_id}/users/{user_id}
PUT    /api/organizations/{org_id}/users/{user_id}
DELETE /api/organizations/{org_id}/users/{user_id}
```

#### Gateways
```
GET    /api/organizations/{org_id}/gateways
POST   /api/organizations/{org_id}/gateways
GET    /api/organizations/{org_id}/gateways/{gateway_id}
PUT    /api/organizations/{org_id}/gateways/{gateway_id}
DELETE /api/organizations/{org_id}/gateways/{gateway_id}
```

#### Applications
```
GET    /api/organizations/{org_id}/applications
POST   /api/organizations/{org_id}/applications
GET    /api/organizations/{org_id}/applications/{app_id}
PUT    /api/organizations/{org_id}/applications/{app_id}
DELETE /api/organizations/{org_id}/applications/{app_id}
GET    /api/organizations/{org_id}/applications/{app_id}/stats
```

#### Workflows (Organization-Level Batch Processing)
```
GET    /api/organizations/{org_id}/workflows
POST   /api/organizations/{org_id}/workflows
GET    /api/organizations/{org_id}/workflows/{workflow_id}
PUT    /api/organizations/{org_id}/workflows/{workflow_id}
DELETE /api/organizations/{org_id}/workflows/{workflow_id}
```

#### Workflow Tables
```
GET    /api/organizations/{org_id}/workflows/{workflow_id}/tables
POST   /api/organizations/{org_id}/workflows/{workflow_id}/tables
GET    /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
PUT    /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
DELETE /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
```

### Application-Level Resources

#### Machines
```
GET    /api/organizations/{org_id}/applications/{app_id}/machines
POST   /api/organizations/{org_id}/applications/{app_id}/machines
GET    /api/organizations/{org_id}/applications/{app_id}/machines/{machine_id}
PUT    /api/organizations/{org_id}/applications/{app_id}/machines/{machine_id}
DELETE /api/organizations/{org_id}/applications/{app_id}/machines/{machine_id}
```

#### Event Classes
```
GET    /api/organizations/{org_id}/applications/{app_id}/event-classes
POST   /api/organizations/{org_id}/applications/{app_id}/event-classes
PUT    /api/organizations/{org_id}/applications/{app_id}/event-classes (bulk replace)
GET    /api/organizations/{org_id}/applications/{app_id}/event-classes/{ec_id}
DELETE /api/organizations/{org_id}/applications/{app_id}/event-classes/{ec_id}
```

#### Connectors
```
GET    /api/organizations/{org_id}/applications/{app_id}/connectors
POST   /api/organizations/{org_id}/applications/{app_id}/connectors
GET    /api/organizations/{org_id}/applications/{app_id}/connectors/{connector_id}
PUT    /api/organizations/{org_id}/applications/{app_id}/connectors/{connector_id}
DELETE /api/organizations/{org_id}/applications/{app_id}/connectors/{connector_id}
```

#### Pipelines (Application-Level Streaming Rules)
```
GET    /api/organizations/{org_id}/applications/{app_id}/pipelines
POST   /api/organizations/{org_id}/applications/{app_id}/pipelines
GET    /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}
PUT    /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}
DELETE /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}
```

#### Rules (Within Pipelines)
```
GET    /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}/rules
POST   /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}/rules
GET    /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}/rules/{rule_id}
PUT    /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}/rules/{rule_id}
DELETE /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}/rules/{rule_id}
```
#### Connector Templates
GET /api/connector-templates
## Key Concepts

### Pipelines vs Workflows

**Pipelines** (Application-level, real-time):
- Located at: `/api/organizations/{org_id}/applications/{app_id}/pipelines`
- Stored in: `pipelines` table in tenant DB
- Purpose: Real-time event processing with SQL/Python rules
- Contains: `rules` (SQL or Python transformations)
- Triggers: Event classes (e.g., "power", "temperature")
- Execution: Streaming (QuixStreams)

**Workflows** (Organization-level, batch):
- Located at: `/api/organizations/{org_id}/workflows`
- Stored in: `workflows` table in tenant DB
- Purpose: Batch/windowed processing for aggregations (OEE, metrics)
- Contains: `tables` (computed aggregation tables)
- Triggers: Windowed events (tumbling, sliding, stepping)
- Execution: Temporal workflows

### Multi-Tenancy Model

1. **Organization Creation**:
   - Creates record in global `organizations` table
   - Creates new PostgreSQL database: `org_{organization_id}`
   - Initializes tenant tables in the new database

2. **Data Access**:
   - Global resources: Always use global database
   - Tenant resources: Use `org_id` to determine which database
   - API automatically routes to correct database

3. **Data Isolation**:
   - Each organization's data is in a separate database
   - No cross-tenant data leakage
   - Users can only access their organization's data

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

### Create Application
```bash
POST /api/organizations/{org_id}/applications
{
  "name": "CNC Monitoring",
  "slug": "cnc-monitoring",
  "status": "active"
}
```

### Create Streaming Pipeline with Rules
```bash
POST /api/organizations/{org_id}/applications/{app_id}/pipelines
{
  "name": "Power Monitoring",
  "triggers": ["power"],
  "rules": [
    {
      "name": "calculate_volume",
      "type": "sql",
      "definition": "SELECT value * 1.5 AS adjusted_power FROM power",
      "publish": true
    }
  ]
}
```

### Create Batch Workflow with Tables
```bash
POST /api/organizations/{org_id}/workflows
{
  "application_id": "{app_id}",
  "name": "OEE Calculation",
  "task_queue": "syncore-compute",
  "window": {
    "type": "tumbling",
    "triggers": ["m30"]
  },
  "tables": [
    {
      "name": "availability",
      "upsert_constraints": ["batch_id", "machine_id"],
      "function": {
        "type": "sql",
        "definition": "SELECT batch_id, machine_id, SUM(duration) as uptime FROM events GROUP BY batch_id, machine_id"
      },
      "order": 1
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

# List applications for an org
curl http://localhost:8001/api/organizations/{org_id}/applications

# List pipelines for an application
curl http://localhost:8001/api/organizations/{org_id}/applications/{app_id}/pipelines

# List workflows for an organization
curl http://localhost:8001/api/organizations/{org_id}/workflows
```
# SyncCore Multi-Tenant Architecture

## Complete System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                         GLOBAL LAYER                                   │
│  (Database name from config: "instance_config" or "autentio")         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │   organizations  │  │      users       │  │ user_organizations │ │
│  ├──────────────────┤  ├──────────────────┤  ├────────────────────┤ │
│  │ - Acme Mfg      │  │ - jane@ex.com   │  │ jane → Acme (owner)│ │
│  │ - GlobalTech    │  │ - john@ex.com   │  │ jane → Global (adm)│ │
│  │ - FactoryX      │  │ - bob@ex.com    │  │ john → Acme (view) │ │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘ │
│                                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │  connector_templates    │  │         services                 │  │
│  ├─────────────────────────┤  ├──────────────────────────────────┤  │
│  │ - fanuc (edge)         │  │ - MQTT Broker                    │  │
│  │ - siemens (edge)       │  │ - Authentication Service         │  │
│  │ - postgresql (cloud)   │  │ - Temporal Server                │  │
│  │ - influxdb (cloud)     │  │                                  │  │
│  └─────────────────────────┘  └──────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
┌─────────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│   TENANT: Acme Mfg      │ │  TENANT: GlobalTech  │ │  TENANT: FactoryX    │
│   DB: org_acme_uuid     │ │  DB: org_global_uuid │ │  DB: org_factory_uuid│
├─────────────────────────┤ ├──────────────────────┤ ├──────────────────────┤
│                         │ │                      │ │                      │
│ ┌─────────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │
│ │   applications      │ │ │ │  applications    │ │ │ │  applications    │ │
│ ├─────────────────────┤ │ │ ├──────────────────┤ │ │ ├──────────────────┤ │
│ │ - CNC Monitoring   │ │ │ │ - Quality Track  │ │ │ │ - Assembly Line  │ │
│ │ - Assembly Track   │ │ │ │ - Energy Mgmt    │ │ │ │                  │ │
│ └─────────────────────┘ │ │ └──────────────────┘ │ │ └──────────────────┘ │
│                         │ │                      │ │                      │
│ ┌─────────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │
│ │     machines        │ │ │ │    machines      │ │ │ │    machines      │ │
│ ├─────────────────────┤ │ │ ├──────────────────┤ │ │ ├──────────────────┤ │
│ │ - CNC Lathe #1     │ │ │ │ - Inspection A1  │ │ │ │ - Robot Arm #5   │ │
│ │ - CNC Mill #2      │ │ │ │ - QC Station #3  │ │ │ │ - Conveyor #12   │ │
│ └─────────────────────┘ │ │ └──────────────────┘ │ │ └──────────────────┘ │
│                         │ │                      │ │                      │
│ ┌─────────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │
│ │    connectors       │ │ │ │   connectors     │ │ │ │   connectors     │ │
│ ├─────────────────────┤ │ │ ├──────────────────┤ │ │ ├──────────────────┤ │
│ │ FANUC (template)   │ │ │ │ OPC UA (template)│ │ │ │ Modbus (template)│ │
│ │ → 192.168.1.100    │ │ │ │ → qa.local:4840  │ │ │ │ → plc.factory    │ │
│ └─────────────────────┘ │ │ └──────────────────┘ │ │ └──────────────────┘ │
│                         │ │                      │ │                      │
│ ┌─────────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │
│ │ pipelines (stream)  │ │ │ │ pipelines        │ │ │ │ pipelines        │ │
│ │ workflows (batch)   │ │ │ │ workflows        │ │ │ │ workflows        │ │
│ │ event_classes       │ │ │ │ event_classes    │ │ │ │ event_classes    │ │
│ └─────────────────────┘ │ │ └──────────────────┘ │ │ └──────────────────┘ │
│                         │ │                      │ │                      │
└─────────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

## User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User Login                                                  │
│     POST /api/auth/login                                        │
│     { email: "jane@example.com", password: "..." }             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Query GLOBAL DATABASE                                       │
│     SELECT * FROM users WHERE email = 'jane@example.com'       │
│     → Found user_id: abc123                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Get User's Organizations                                    │
│     SELECT * FROM user_organizations WHERE user_id = 'abc123'  │
│     → Acme (owner), GlobalTech (admin), FactoryX (viewer)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Return to User                                              │
│     {                                                           │
│       user_id: "abc123",                                        │
│       name: "Jane Doe",                                         │
│       organizations: [                                          │
│         { id: "org1", name: "Acme Mfg", role: "owner" },       │
│         { id: "org2", name: "GlobalTech", role: "admin" },     │
│         { id: "org3", name: "FactoryX", role: "viewer" }       │
│       ]                                                         │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. User Selects Organization                                   │
│     → Frontend shows dropdown                                   │
│     → User picks "Acme Mfg"                                     │
│     → Store org_id in session/localStorage                      │
└─────────────────────────────────────────────────────────────────┘
```

## Data Access Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend Request                                                │
│  GET /api/organizations/{org_id}/applications/{app_id}/machines │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Verify Organization (GLOBAL DB)                             │
│     SELECT * FROM organizations WHERE id = {org_id}            │
│     ✓ Organization exists                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Switch to Tenant Database                                   │
│     Connect to: org_{org_id}                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Query Tenant Data                                           │
│     SELECT * FROM machines WHERE application_id = {app_id}     │
│     → Returns machines for that application                     │
└─────────────────────────────────────────────────────────────────┘
```

## Connector Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Frontend: List Available Templates                          │
│     GET /api/connector-templates                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Query GLOBAL DATABASE                                       │
│     SELECT * FROM connector_templates                           │
│     → fanuc, siemens, postgresql, influxdb, etc.               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. User Selects "FANUC" Template                               │
│     GET /api/connector-templates/fanuc                          │
│     → Returns form schema (collections, variables)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Frontend Shows Form                                         │
│     Collections:                                                │
│     ☑ Machine Data                                              │
│     ☑ Machine Events                                            │
│     ☐ Tool Data                                                 │
│                                                                 │
│     Variables:                                                  │
│     MTConnect Host: [192.168.1.100      ]                      │
│     MTConnect Port: [5000               ]                      │
│     MQTT Broker:    [mqtt.factory.local ]                      │
│     ...                                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. User Submits Form                                           │
│     POST /api/organizations/{org_id}/applications/{app_id}/     │
│          connectors                                             │
│     {                                                           │
│       template_id: "fanuc",                                     │
│       name: "CNC Lathe #1",                                     │
│       collections: { machines: true, events: true },            │
│       properties: { agent_host: "192.168.1.100", ... }         │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Validate Against Template (GLOBAL DB)                      │
│     SELECT * FROM connector_templates WHERE id = 'fanuc'       │
│     ✓ All required fields present                               │
│     ✓ Values match validation rules                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Create Connector Instance (TENANT DB)                       │
│     INSERT INTO org_{org_id}.connectors VALUES (...)           │
│     ✓ Connector created and stored in tenant database           │
└─────────────────────────────────────────────────────────────────┘
```

## Database Naming Convention

### Global Database
```
Name: From config (e.g., "instance_config", "autentio", "synccore_global")
       ↑
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

## Key Points

1. **Global database name is NOT hardcoded**
   - It comes from your bridge configuration
   - "autentio" is just a development default
   - Can be "instance_config", "production_db", anything

2. **user_organizations is in GLOBAL database**
   - Correct! It maps users to organizations
   - Must be global so login can query it
   - One user → many organizations

3. **connector_templates are in GLOBAL database**
   - Shared across all organizations
   - Templates are blueprints, not instances
   - One template → many connector instances

4. **All operational data is in TENANT databases**
   - applications, machines, connectors, pipelines, workflows
   - Completely isolated per organization
   - Cannot be accessed across orgs

5. **Automatic routing in ConfigManagerService**
   - Global tables → always use global database
   - Tenant tables → use org_{org_id} database
   - Developer doesn't need to think about it

