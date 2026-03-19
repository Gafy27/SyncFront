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
