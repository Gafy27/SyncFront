# SyncCore API

Multi-tenant REST API for managing SyncCore industrial data platform.

## Quick Start

```bash
# Install dependencies
poetry install

# Load connector templates
poetry run python api/loaders/connector_templates.py

# Seed test data
poetry run python api/test/fast.py

# Start API server
poetry run python api/main.py
```

API available at: `http://localhost:8001`

## Documentation

- **[API_STRUCTURE.md](API_STRUCTURE.md)** - Complete API endpoints reference
- **[DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)** - Multi-tenant database design
- **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** - Visual architecture overview
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Multi-organization user authentication
- **[CONNECTOR_TEMPLATES.md](CONNECTOR_TEMPLATES.md)** - Connector template system

## Architecture Overview

### Two-Tier Database System

```
GLOBAL DATABASE (instance_config)
├── organizations          # All organizations
├── users                  # All user accounts
├── user_organizations     # User-org memberships (many-to-many)
├── connector_templates    # Connector blueprints
└── services               # Global services

TENANT DATABASES (org_{org_id})
├── applications           # Apps per org
├── machines               # Machines per org
├── connectors             # Connector instances
├── pipelines              # Streaming rules
├── workflows              # Batch processing
└── ... (9 tables total)
```

### Key Concepts

**Global Database** = Cross-organizational data (users, templates, orgs)
**Tenant Database** = Organization-specific data (machines, connectors, pipelines)

**Templates** = Blueprints/schemas (e.g., "FANUC connector needs these fields")
**Instances** = Filled-out forms (e.g., "FANUC @ 192.168.1.100")

**Pipelines** = Real-time streaming rules (application-level)
**Workflows** = Batch processing aggregations (organization-level)

## API Endpoints

### Authentication
```
POST /api/auth/login                                    # Login, get organizations
GET  /api/auth/me?user_id={id}                         # Get current user
POST /api/auth/organizations/{org_id}/members          # Add user to org
```

### Organizations
```
GET  /api/organizations                                 # List all orgs
POST /api/organizations                                 # Create org
GET  /api/organizations/{org_id}                        # Get org details
```

### Applications
```
GET  /api/organizations/{org_id}/applications           # List apps
POST /api/organizations/{org_id}/applications           # Create app
```

### Machines
```
GET  /api/organizations/{org_id}/applications/{app_id}/machines
POST /api/organizations/{org_id}/applications/{app_id}/machines
```

### Streaming Pipelines (Application-Level)
```
GET  /api/organizations/{org_id}/applications/{app_id}/pipelines
POST /api/organizations/{org_id}/applications/{app_id}/pipelines
GET  /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}/rules
POST /api/organizations/{org_id}/applications/{app_id}/pipelines/{pipeline_id}/rules
```

### Batch Workflows (Organization-Level)
```
GET  /api/organizations/{org_id}/workflows
POST /api/organizations/{org_id}/workflows
GET  /api/organizations/{org_id}/workflows/{workflow_id}/tables
POST /api/organizations/{org_id}/workflows/{workflow_id}/tables
```

## Examples

### Login & Select Organization
```bash
# 1. Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "pass"}'

# Response:
{
  "user_id": "...",
  "organizations": [
    {"organization_id": "org1", "name": "Acme Mfg", "role": "owner"},
    {"organization_id": "org2", "name": "GlobalTech", "role": "admin"}
  ]
}

# 2. User selects "Acme Mfg" in frontend
# Store org_id in session/localStorage
```

### Create Streaming Pipeline
```bash
POST /api/organizations/{org_id}/applications/{app_id}/pipelines
Content-Type: application/json

{
  "name": "Power Monitoring",
  "triggers": ["power"],
  "rules": [
    {
      "name": "check_overload",
      "type": "sql",
      "definition": "SELECT * FROM power WHERE value > 90",
      "publish": true
    }
  ]
}
```

### Create Batch Workflow
```bash
POST /api/organizations/{org_id}/workflows
Content-Type: application/json

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
      "upsert_constraints": ["batch_id"],
      "function": {
        "type": "sql",
        "definition": "SELECT ..."
      }
    }
  ]
}
```

### Use Connector Template
```bash
# 1. List available templates
GET /api/connector-templates

# 2. Get template form schema
GET /api/connector-templates/fanuc

# 3. Create connector instance
POST /api/organizations/{org_id}/applications/{app_id}/connectors
{
  "template_id": "fanuc",
  "name": "CNC Lathe #1",
  "properties": {
    "agent_host": "192.168.1.100",
    "mqtt_broker_host": "mqtt.factory.local",
    ...
  },
  "collections": {
    "machines": true,
    "events": true
  }
}
```

## Connector Templates

### Edge Connectors (Data Collection)
- `fanuc` - FANUC CNC (MTConnect)
- `siemens` - Siemens PLC (S7)
- `opcua` - OPC UA devices
- `modbus` - Modbus TCP

### Cloud Connectors (Data Output)
- `postgresql` - PostgreSQL database
- `timescaledb` - TimescaleDB
- `influxdb` - InfluxDB
- `mongodb` - MongoDB
- `kafka` - Apache Kafka
- `http_api` - HTTP REST API

Templates define:
- **Collections**: What data types to capture (checkboxes)
- **Variables**: Connection settings (form fields)
- **Validation**: Field requirements and rules

## Testing

```bash
# Load connector templates
poetry run python api/loaders/connector_templates.py

# Seed test data (1 org, 1 user, 1 app, sample data)
poetry run python api/test/fast.py

# Test multi-org authentication
poetry run python api/test/test_auth.py
```

## Project Structure

```
api/
├── main.py                      # FastAPI app entry point
├── database.py                  # Multi-tenant database manager
├── routers/
│   ├── auth.py                  # Authentication endpoints
│   ├── organizations.py         # Org, app, machine endpoints
│   ├── pipelines.py             # Streaming pipelines & rules
│   ├── workflows.py             # Batch workflows & tables
│   └── services.py              # Global services
├── loaders/
│   └── connector_templates.py   # Template loader
├── test/
│   ├── fast.py                  # Seed script
│   └── test_auth.py             # Multi-org test
└── docs/
    ├── API_STRUCTURE.md
    ├── DATABASE_ARCHITECTURE.md
    ├── ARCHITECTURE_DIAGRAM.md
    ├── AUTHENTICATION.md
    └── CONNECTOR_TEMPLATES.md

config/
├── api.yml                      # API configuration
├── internal_bridge.yml          # Database bridges
└── connector_templates.yml      # Connector templates

models/config/api/
├── organization.py              # Organization models
├── application.py               # Application models
├── user.py                      # User & auth models
├── machine.py                   # Machine models
├── connector.py                 # Connector models
├── rule.py                      # Pipeline & rule models
├── workflow.py                  # Workflow & table models
└── ...
```

## Key Design Decisions

### Why Global Database?
- Users can belong to multiple organizations
- Connector templates shared across all orgs
- Single login for all organizations
- Centralized user management

### Why Tenant Databases?
- Data isolation (Org A cannot access Org B)
- Security (physical separation)
- Performance (queries only scan one org)
- Compliance (GDPR, data residency)
- Scalability (scale orgs independently)

### Why Templates?
- Consistency (all FANUC connectors same structure)
- Self-service (users create connectors without coding)
- Validation (enforce required fields)
- Flexibility (add connector types via YAML)

### Pipelines vs Workflows
- **Pipelines**: Real-time streaming (QuixStreams, Kafka)
  - Application-scoped
  - Event-driven rules
  - SQL/Python transformations

- **Workflows**: Batch processing (Temporal)
  - Organization-scoped
  - Window-based aggregations
  - Compute tables (OEE, metrics)

## Development Workflow

1. **Setup**: `poetry install`
2. **Load templates**: `poetry run python api/loaders/connector_templates.py`
3. **Seed data**: `poetry run python api/test/fast.py`
4. **Start API**: `poetry run python api/main.py`
5. **Test**: `curl http://localhost:8001/api/organizations`

## Production Checklist

- [ ] Change global database name from "autentio" to "instance_config"
- [ ] Implement password hashing (bcrypt/argon2)
- [ ] Generate JWT tokens for authentication
- [ ] Add rate limiting
- [ ] Implement MFA
- [ ] Add audit logging
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Add monitoring/alerting
- [ ] Implement caching

## Support

- **Documentation**: See `api/*.md` files
- **Issues**: GitHub Issues
- **API Docs**: `http://localhost:8001/docs` (Swagger UI)
