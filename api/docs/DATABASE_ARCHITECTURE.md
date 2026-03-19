# Database Architecture

## Overview

SyncCore uses a **multi-tenant database architecture** with one global database and multiple tenant databases.

## Database Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL DATABASE                                            │
│  (Name from config - e.g., "instance_config", "autentio")  │
│                                                             │
│  Purpose: Store cross-organization data                    │
│                                                             │
│  Tables:                                                    │
│  ├── organizations          (all organizations)            │
│  ├── users                  (all user accounts)            │
│  ├── user_organizations     (user-org memberships)         │
│  ├── connector_templates    (connector blueprints)         │
│  └── services               (global services)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Creates tenant databases
                              ▼
        ┌─────────────────────────────────────────────┐
        │  TENANT DATABASE: org_<org_id_1>           │
        │                                             │
        │  Purpose: Store organization-specific data  │
        │                                             │
        │  Tables:                                    │
        │  ├── applications                           │
        │  ├── gateways                               │
        │  ├── machines                               │
        │  ├── connectors                             │
        │  ├── event_classes                          │
        │  ├── pipelines                              │
        │  ├── rules                                  │
        │  ├── workflows                              │
        │  └── workflow_tables                        │
        └─────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────┐
        │  TENANT DATABASE: org_<org_id_2>           │
        │                                             │
        │  Same structure as above...                 │
        └─────────────────────────────────────────────┘

        ... (one database per organization)
```

## Global Database

### What It Is
The global database sits **above all organizations** and stores cross-organizational data.

### Database Name
The database name comes from your bridge configuration file (`config/internal_bridge.yml`), typically:
- `instance_config` (production)
- `autentio` (development default)
- Or any other name you configure

**Important**: "autentio" is NOT hardcoded - it's just the default name in the example config. In production, you can name it anything.

### Global Tables

```sql
-- organizations: All organizations in the system
CREATE TABLE organizations (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,  -- {name, slug, status, settings}
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- users: All user accounts (across all organizations)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,  -- {name, email, status, last_login}
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- user_organizations: Many-to-many relationship
CREATE TABLE user_organizations (
    id TEXT PRIMARY KEY,  -- {user_id}_{org_id}
    value JSONB NOT NULL,  -- {user_id, organization_id, role, status}
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- connector_templates: Connector blueprints (shared across orgs)
CREATE TABLE connector_templates (
    id TEXT PRIMARY KEY,  -- fanuc, siemens, postgresql, etc.
    value JSONB NOT NULL,  -- {name, type, collections, variables}
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- services: Global service configurations
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,  -- {name, type, enabled, configuration}
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Why Global?

**Users** - A user can belong to multiple organizations. Storing users globally allows:
- Single login for all organizations
- Cross-organization user management
- Easier user provisioning

**user_organizations** - Maps which users belong to which organizations with what roles:
```json
{
  "user_id": "user-uuid",
  "organization_id": "org-uuid",
  "role": "admin",
  "status": "active"
}
```

**connector_templates** - Templates are shared across all organizations:
- Consistency: All orgs use same FANUC connector template
- Centralized updates: Update template once, all orgs benefit
- No duplication: Templates defined once

**organizations** - The list of all organizations in the system.

**services** - Global services like MQTT brokers, authentication providers.

## Tenant Databases

### What They Are
Each organization gets its own isolated PostgreSQL database.

### Database Name Format
`org_{organization_id_with_underscores}`

Example:
- Organization ID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- Database name: `org_a1b2c3d4_e5f6_7890_abcd_ef1234567890`

### Tenant Tables

All operational data lives in tenant databases:

```sql
-- Applications within the organization
CREATE TABLE applications (...);

-- Gateways (edge devices)
CREATE TABLE gateways (...);

-- Machines/devices
CREATE TABLE machines (...);

-- Connector instances (references global templates)
CREATE TABLE connectors (...);

-- Event class definitions
CREATE TABLE event_classes (...);

-- Streaming pipelines (real-time rules)
CREATE TABLE pipelines (...);
CREATE TABLE rules (...);

-- Batch workflows (aggregations)
CREATE TABLE workflows (...);
CREATE TABLE workflow_tables (...);
```

### Why Tenant-Specific?

**Data Isolation** - Each organization's data is physically separated:
- Security: Org A cannot access Org B's data
- Performance: Queries only scan one org's data
- Compliance: Data residency requirements
- Deletion: Drop database to remove org

**Scalability** - Each tenant database can:
- Have its own connection pool
- Be backed up independently
- Be migrated to different servers
- Be sharded differently

## Configuration

### Bridge Configuration (`config/internal_bridge.yml`)

```yaml
bridges:
  config_postgres_dev:
    type: postgresql
    host: localhost
    port: 5432
    user: postgres
    password: postgres
    dbname: instance_config  # ← Global database name
```

Or:

```yaml
bridges:
  timescaledb_local:
    type: timescaledb
    host: timescaledb
    port: 5432
    user: postgres
    password: postgres
    dbname: autentio  # ← Global database name (development)
```

### API Configuration (`config/api.yml`)

```yaml
database:
  url: "postgresql://postgres:postgres@timescaledb:5432/instance_config"
  #                                                      ^^^^^^^^^^^^^^^^
  #                                                      Global database name

tables:
  - organizations          # Global
  - users                  # Global
  - user_organizations     # Global
  - connector_templates    # Global
  - services               # Global
  - applications           # Tenant
  - gateways               # Tenant
  - machines               # Tenant
  - connectors             # Tenant
  - event_classes          # Tenant
  - pipelines              # Tenant
  - rules                  # Tenant
  - workflows              # Tenant
  - workflow_tables        # Tenant
```

## Database Manager Logic

### In `api/database.py`

```python
class ConfigManagerService:
    # Global tables (stored in global database)
    GLOBAL_TABLES = [
        "organizations",
        "users",
        "user_organizations",
        "services",
        "connector_templates"
    ]

    def _get_bridge(self, org_id: str | None = None):
        """Get database bridge for global or tenant."""

        if org_id is None:
            # Return bridge to GLOBAL database
            # (whatever dbname is in config)
            return self._global_bridge
        else:
            # Return bridge to TENANT database
            # dbname = org_{org_id}
            return self._tenant_bridges[org_id]
```

### Routing Logic

```python
# Global table access
await db.get("users", user_id)
# → Queries: instance_config.users

# Tenant table access
await db.get("machines", machine_id, org_id="org-uuid")
# → Queries: org_a1b2c3d4_e5f6_7890_abcd_ef1234567890.machines
```

## Data Flow Examples

### User Login
1. Query **global** `users` table by email
2. Query **global** `user_organizations` table for memberships
3. Return list of organizations user can access

### Create Machine
1. Verify organization exists in **global** `organizations` table
2. Verify application exists in **tenant** `applications` table
3. Create machine in **tenant** `machines` table

### Create Connector
1. Get template from **global** `connector_templates` table
2. Use template schema to validate connector data
3. Create connector instance in **tenant** `connectors` table

## Migrations & Deployment

### Initial Setup
```sql
-- 1. Create global database (manual or via config)
CREATE DATABASE instance_config;

-- 2. Initialize global tables
-- (Done automatically by ConfigManagerService.init_tables())
```

### Organization Creation
```sql
-- 1. Create org record in global database
INSERT INTO instance_config.organizations VALUES (...);

-- 2. Create tenant database
CREATE DATABASE org_a1b2c3d4_e5f6_7890_abcd_ef1234567890;

-- 3. Initialize tenant tables
-- (Done automatically by ConfigManagerService.init_tenant_tables(org_id))
```

### User Provisioning
```sql
-- 1. Create user in global database
INSERT INTO instance_config.users VALUES (...);

-- 2. Add user to organization(s)
INSERT INTO instance_config.user_organizations VALUES (...);
```

## Benefits of This Architecture

### Security
- Physical data isolation between organizations
- No shared tables = no cross-tenant queries possible
- Easy to encrypt different orgs differently

### Performance
- Each org's queries only scan their data
- Can optimize indexes per org
- Can scale orgs independently

### Compliance
- Can store different orgs in different regions
- Easy data deletion (drop database)
- Clear data boundaries for GDPR

### Operational
- Backup/restore per organization
- Easy to migrate org to different server
- Debug one org without affecting others

## Summary

**Global Database** (name from config):
- Stores: users, organizations, user_organizations, connector_templates, services
- Shared across all organizations
- Single source of truth

**Tenant Databases** (org_{org_id}):
- One per organization
- Stores: applications, machines, connectors, pipelines, workflows, etc.
- Completely isolated

The global database name ("autentio", "instance_config", etc.) is just a configuration value - not hardcoded. The architecture remains the same regardless of the name.
