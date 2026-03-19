# Connector Templates

## Overview

Connector templates define the **schema** for connector instances. They are NOT actual connectors - they are the blueprints/forms that users fill out when creating connectors.

Think of it like this:
- **Template** = The form/schema (e.g., "FANUC connector needs these fields")
- **Connector Instance** = The filled-out form (e.g., "FANUC connector for Machine #1 at IP 192.168.1.100")

## Architecture

### Storage
- **Location**: Global database (`autentio` by default)
- **Table**: `connector_templates`
- **Loaded from**: `config/connector_templates.yml`

### Database Hierarchy
```
Global Database (autentio):
├── organizations
├── users
├── user_organizations (many-to-many)
├── connector_templates ← Templates stored here
└── services

Tenant Database (org_{org_id}):
├── applications
├── connectors ← Connector instances (reference templates)
├── machines
├── gateways
└── ...
```

## Connector Types

### Edge Connectors
Run on edge devices (gateways) to collect data from machines.

**Available Templates**:
- `fanuc` - FANUC CNC machines (MTConnect)
- `siemens` - Siemens PLCs (S7 protocol)
- `opcua` - OPC UA industrial devices
- `modbus` - Modbus TCP devices

### Cloud Connectors
Run in SyncCore cloud to write data to external systems.

**Available Templates**:
- `postgresql` - PostgreSQL database
- `timescaledb` - TimescaleDB (time-series)
- `influxdb` - InfluxDB (time-series)
- `mongodb` - MongoDB (documents)
- `kafka` - Apache Kafka (streaming)
- `http_api` - Generic HTTP REST API

## Template Structure

### YAML Format

```yaml
templates:
  - id: fanuc                    # Unique template ID
    name: "FANUC"                # Display name
    slug: fanuc                  # URL-friendly slug
    driver: fanuc                # Driver identifier
    version: "1.0.0"             # Template version
    type: edge                   # edge | cloud
    description: "..."           # Description
    is_active: true              # Enable/disable template

    # Data collections - what data types to capture
    collections:
      - name: machines
        label: "Machine Data"
        description: "Basic machine information"
        enabled_by_default: true

      - name: events
        label: "Machine Events"
        enabled_by_default: true

    # Configuration variables - the form fields
    variables:
      - name: agent_host
        label: "MTConnect Agent Host"
        type: string              # string|integer|password|boolean|select|json
        required: true
        default: "192.168.1.100"
        description: "IP address of MTConnect agent"
        validation:
          pattern: "^[a-zA-Z0-9.-]+$"
          min: 1
          max: 255

      - name: mqtt_password
        label: "MQTT Password"
        type: password
        required: false
        sensitive: true           # Mark as sensitive (hide in UI)
```

## Variable Types

### Basic Types
- `string` - Text input
- `integer` - Number input
- `password` - Password input (hidden)
- `boolean` - Checkbox
- `json` - JSON editor

### Select Type
```yaml
- name: mqtt_qos
  type: select
  options:
    - value: 0
      label: "At most once (0)"
    - value: 1
      label: "At least once (1)"
```

### Validation
```yaml
validation:
  pattern: "^[a-z0-9]+$"    # Regex pattern
  min: 1                     # Min value/length
  max: 100                   # Max value/length
```

## Loading Templates

### Manual Load
```bash
poetry run python api/loaders/connector_templates.py
```

### Programmatic Load
```python
from api.loaders.connector_templates import load_connector_templates
from api.database import ConfigManagerService

async def load_templates():
    config_manager = ConfigManagerService()
    await config_manager.connect()
    await config_manager.init_tables()
    await load_connector_templates(config_manager)
    await config_manager.disconnect()
```

### On Startup (Add to lifespan)
```python
# In api/main.py
@asynccontextmanager
async def lifespan(app):
    await config_manager.connect()
    await config_manager.init_tables()
    await load_connector_templates(config_manager)  # Load templates
    yield
    await config_manager.disconnect()
```

## Usage Flow

### 1. Frontend Lists Templates
```bash
GET /api/connector-templates
```

Response:
```json
[
  {
    "id": "fanuc",
    "name": "FANUC",
    "type": "edge",
    "description": "Edge connector for FANUC CNC machines",
    "collections": [...],
    "variables": [...]
  }
]
```

### 2. User Selects Template

Frontend shows:
- Template name and description
- Collections checkboxes (which data to capture)
- Form fields from variables (connection settings)

### 3. User Fills Out Form

Example for FANUC connector:
```json
{
  "template_id": "fanuc",
  "name": "CNC Machine #1",
  "collections": {
    "machines": true,
    "events": true,
    "tooling": false
  },
  "properties": {
    "agent_host": "192.168.1.100",
    "agent_port": 5000,
    "mqtt_broker_host": "mqtt.factory.local",
    "mqtt_broker_port": 1883,
    "mqtt_topic_prefix": "factory/cnc1",
    "poll_interval": 5
  }
}
```

### 4. Frontend Creates Connector Instance
```bash
POST /api/organizations/{org_id}/applications/{app_id}/connectors
Content-Type: application/json

{
  "template_id": "fanuc",
  "name": "CNC Machine #1",
  "driver": "fanuc",
  "scope": "application",
  "properties": {...},
  "collections": {...}
}
```

### 5. Connector Stored in Tenant Database

The connector instance is stored in `org_{org_id}` database:
```json
{
  "id": "uuid",
  "organization_id": "org_uuid",
  "application_id": "app_uuid",
  "template_id": "fanuc",          // Reference to template
  "name": "CNC Machine #1",
  "driver": "fanuc",
  "properties": {...},             // Filled-out form
  "collections": {...}             // Selected collections
}
```

## Adding New Templates

### 1. Edit YAML File
Add new template to `config/connector_templates.yml`:

```yaml
templates:
  - id: my_new_connector
    name: "My Connector"
    type: edge
    # ... rest of configuration
```

### 2. Load Templates
```bash
poetry run python api/loaders/connector_templates.py
```

### 3. Verify
Check that template appears in database:
```bash
curl http://localhost:8001/api/connector-templates
```

## Example Templates

### Edge Connector (FANUC)
```yaml
- id: fanuc
  name: "FANUC"
  type: edge
  collections:
    - name: machines
      enabled_by_default: true
  variables:
    - name: agent_host
      type: string
      required: true
    - name: mqtt_broker_host
      type: string
      required: true
```

### Cloud Connector (PostgreSQL)
```yaml
- id: postgresql
  name: "PostgreSQL"
  type: cloud
  collections:
    - name: timeseries
      enabled_by_default: true
  variables:
    - name: host
      type: string
      required: true
    - name: database
      type: string
      required: true
    - name: password
      type: password
      required: true
      sensitive: true
```

## API Endpoints (To Be Implemented)

### List Templates
```
GET /api/connector-templates
GET /api/connector-templates?type=edge
GET /api/connector-templates?type=cloud
```

### Get Template Details
```
GET /api/connector-templates/{template_id}
```

Returns full template with form schema.

### Get Form Schema
```
GET /api/connector-templates/{template_id}/form-schema
```

Returns optimized schema for frontend form rendering.

## Benefits

1. **Consistency**: All connectors of same type have same structure
2. **Validation**: Templates define required fields and validation rules
3. **Self-Service**: Users can create connectors without coding
4. **Flexibility**: Add new connector types without code changes
5. **Documentation**: Templates serve as documentation
6. **Type Safety**: Frontend knows exact structure to expect

## Summary

**Connector Templates** = Blueprints stored in **global database**
**Connector Instances** = Filled blueprints stored in **tenant databases**

Templates define what fields are needed; instances contain the actual values.
