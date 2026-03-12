# Syncore API — Workflows, Tables & SQL Execution

Reference for building agent integrations against the Syncore REST API.
Base URL: `http://localhost:8000`

All authenticated endpoints require a Bearer token in the `Authorization` header.

---

## Authentication

```
POST /api/auth/login
Content-Type: application/json

{ "email": "...", "password": "..." }
```

Response: `{ "access_token": "<jwt>", "token_type": "bearer" }`

Use the token on all subsequent requests:
```
Authorization: Bearer <access_token>
```

---

## Database Architecture

The API uses a single PostgreSQL database (`api`) with a **multi-tenant schema layout**:

| Schema              | Tables                                                      |
|---------------------|-------------------------------------------------------------|
| `public`            | `organizations`, `users`, `user_organizations`, `connector_templates` |
| `org_{org_uuid_}` * | `bridges`, `machines`, `events`, `workflows`, `workflow_tables` |

\* Dashes in the org UUID are replaced by underscores. Example: org `550e8400-e29b-41d4-a716-446655440000` → schema `org_550e8400_e29b_41d4_a716_446655440000`.

All tables use the same key-value schema:
```sql
id         TEXT PRIMARY KEY
value      JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

A separate `logging` database stores Temporal execution logs:
- `workflow_runs` — one row per workflow run
- `activity_logs` — one row per activity within a run

---

## Workflow API

### Data Models

#### `WorkflowType` (enum)
```
"batch" | "stream"
```

#### `WindowType` (enum, batch only)
```
"tumbling" | "sliding" | "stepping"
```

#### `WindowConfig` (batch only)
```json
{
  "type": "tumbling",          // required
  "size": "5m",                // required for tumbling/sliding (e.g. "1m", "1h")
  "step": "1m",                // required for sliding
  "triggers": ["event_a"]      // required for stepping — event names that close the window
}
```

#### `FunctionType` (enum)
```
"python" | "sql"
```

#### `FunctionDefinition`
```json
{
  "type": "sql",
  "definition": "SELECT machine_id, AVG(value) AS avg_val FROM events GROUP BY machine_id"
}
```

#### `TableCreate` — payload for creating a workflow table
```json
{
  "name": "aggregated_events",         // required, 1-255 chars
  "function": {                         // required
    "type": "sql",
    "definition": "SELECT ..."
  },
  "order": 0,                           // optional, default 0 (execution order)

  // Batch-specific (all optional):
  "upsert_constrains": ["machine_id"],  // columns for UNIQUE constraint used in upsert
  "time_column": "ts",                  // when set, creates TimescaleDB hypertable
  "time_compression": true,             // compress the time column
  "sync_schema": true,                  // sync schema before write

  // Stream-specific (all optional):
  "publish": true,                      // publish result to message broker
  "memory": false                       // keep result in memory for downstream queries
}
```

#### `WorkflowCreate` — payload for creating a workflow
```json
{
  "name": "my_workflow",               // required, 1-255 chars
  "type": "batch",                     // required: "batch" | "stream"
  "description": "...",                // optional, max 1000 chars
  "is_enabled": true,                  // optional, default true
  "tables": [],                        // optional, list of TableCreate objects

  // Batch-specific (required when type="batch"):
  "window": { "type": "tumbling", "size": "1h" },
  "task_queue": "default",             // Temporal task queue name
  "timeout": 3600,                     // timeout in seconds

  // Stream-specific (required when type="stream"):
  "triggers": ["machine.event_a"]      // event names that activate this workflow
}
```

#### `Workflow` — full response model
```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "name": "my_workflow",
  "type": "batch",
  "description": null,
  "is_enabled": true,
  "window": { "type": "tumbling", "size": "1h" },
  "task_queue": "default",
  "timeout": 3600,
  "triggers": null,
  "tables": [ /* Table objects, sorted by order */ ],
  "tables_count": 2,
  "last_executed": null,
  "created_at": "2026-01-01T00:00:00",
  "updated_at": "2026-01-01T00:00:00"
}
```

#### `Table` — full response model
```json
{
  "id": "uuid",
  "workflow_id": "uuid",
  "name": "aggregated_events",
  "function": { "type": "sql", "definition": "SELECT ..." },
  "order": 0,
  "upsert_constrains": ["machine_id"],
  "time_column": "ts",
  "time_compression": null,
  "sync_schema": null,
  "publish": null,
  "memory": null,
  "last_computed": null,
  "row_count": 0,
  "created_at": "2026-01-01T00:00:00",
  "updated_at": "2026-01-01T00:00:00"
}
```

---

### Workflow Endpoints

All workflow endpoints are scoped to an organization:
```
/api/organizations/{organization_id}/workflows
```

#### List Workflows
```
GET /api/organizations/{org_id}/workflows
    ?page=1&page_size=50&type=batch
```

Response: `WorkflowList`
```json
{
  "items": [ /* Workflow[] */ ],
  "total": 10,
  "organization_id": "uuid",
  "page": 1,
  "page_size": 50,
  "has_next": false
}
```

Each workflow in `items` includes its `tables` array (sorted by `order`) and `tables_count`.

---

#### Create Workflow
```
POST /api/organizations/{org_id}/workflows
Status: 201 Created
```

Request body: `WorkflowCreate`

- Tables can be included in the create payload (`tables` list). Each is created in order and `order` is auto-assigned if not provided.
- Returns the full `Workflow` object with tables embedded.

**Example — batch workflow with two tables:**
```json
{
  "name": "hourly_aggregation",
  "type": "batch",
  "window": { "type": "tumbling", "size": "1h" },
  "task_queue": "default",
  "timeout": 3600,
  "tables": [
    {
      "name": "raw_counts",
      "function": { "type": "sql", "definition": "SELECT machine_id, COUNT(*) as cnt FROM events GROUP BY machine_id" },
      "upsert_constrains": ["machine_id"],
      "time_column": "ts"
    },
    {
      "name": "summary",
      "function": { "type": "python", "definition": "def run(df): return df.groupby('machine_id').sum()" },
      "order": 1
    }
  ]
}
```

**Example — stream workflow:**
```json
{
  "name": "realtime_monitor",
  "type": "stream",
  "triggers": ["machine.sensor_reading"],
  "tables": [
    {
      "name": "live_state",
      "function": { "type": "sql", "definition": "SELECT machine_id, value FROM events WHERE value > 100" },
      "publish": true,
      "memory": true
    }
  ]
}
```

---

#### Get Workflow
```
GET /api/organizations/{org_id}/workflows/{workflow_id}
```

Returns `Workflow` with tables embedded and sorted by `order`.

---

#### Update Workflow
```
PUT /api/organizations/{org_id}/workflows/{workflow_id}
```

Request body: `WorkflowUpdate` — all fields optional, patch semantics (only provided fields are updated).

```json
{
  "name": "updated_name",
  "is_enabled": false,
  "window": { "type": "tumbling", "size": "30m" }
}
```

Returns updated `Workflow` with current tables.

---

#### Delete Workflow
```
DELETE /api/organizations/{org_id}/workflows/{workflow_id}
Status: 204 No Content
```

Cascade-deletes all associated tables.

---

### Workflow Table Endpoints

```
/api/organizations/{org_id}/workflows/{workflow_id}/tables
```

#### List Tables
```
GET /api/organizations/{org_id}/workflows/{workflow_id}/tables
    ?page=1&page_size=50
```

Response: `TableList`
```json
{
  "items": [ /* Table[] sorted by order */ ],
  "total": 3,
  "workflow_id": "uuid",
  "page": 1,
  "page_size": 50,
  "has_next": false
}
```

---

#### Create Table
```
POST /api/organizations/{org_id}/workflows/{workflow_id}/tables
Status: 201 Created
```

Request body: `TableCreate`

- If `order` is not provided, the table is appended at the end (`order = len(existing_tables)`).
- Returns `Table` object.

---

#### Get Table
```
GET /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
```

Returns `Table`.

---

#### Update Table
```
PUT /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
```

Request body: `TableUpdate` — all fields optional, patch semantics.

```json
{
  "function": { "type": "sql", "definition": "SELECT * FROM events LIMIT 100" },
  "order": 2
}
```

Returns updated `Table`.

---

#### Delete Table
```
DELETE /api/organizations/{org_id}/workflows/{workflow_id}/tables/{table_id}
Status: 204 No Content
```

---

### Workflow Lifecycle Signals

These endpoints publish a Kafka message to control the Temporal workflow execution state.

```
POST /api/organizations/{org_id}/workflows/{workflow_id}/start      → starts the workflow
POST /api/organizations/{org_id}/workflows/{workflow_id}/stop       → stops gracefully
POST /api/organizations/{org_id}/workflows/{workflow_id}/restart    → stop + start
POST /api/organizations/{org_id}/workflows/{workflow_id}/reset      → reset state
POST /api/organizations/{org_id}/workflows/{workflow_id}/terminate  → force terminate
```

All return `204 No Content`.

---

### Workflow Execution Logs

#### List Runs
```
GET /api/organizations/{org_id}/workflows/{workflow_id}/runs
    ?page=1&page_size=50
```

Returns paginated runs, most recent first.

```json
{
  "workflow_id": "uuid",
  "items": [
    {
      "ts": "2026-01-01T12:00:00",
      "run_id": "temporal-run-id",
      "workflow_id": "uuid",
      "status": "completed",
      "duration_ms": 1234,
      "started_at": 1735732800000,
      "completed_at": 1735732801234,
      "workflow_log": {}
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 50,
  "has_next": true
}
```

#### List Activities for a Run
```
GET /api/organizations/{org_id}/workflows/{workflow_id}/runs/{run_id}
    ?page=1&page_size=200
```

Returns activity log entries for a specific Temporal run ID, ordered by time ASC.

```json
{
  "workflow_id": "uuid",
  "run_id": "temporal-run-id",
  "items": [
    {
      "ts": "2026-01-01T12:00:00.100",
      "run_id": "temporal-run-id",
      "workflow_id": "uuid",
      "activity_name": "sql_executor",
      "status": "completed",
      "duration_ms": 250,
      "started_at": 1735732800100,
      "completed_at": 1735732800350,
      "activity_log": {}
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 200,
  "has_next": false
}
```

---

## SQL Execution API

The SQL API allows executing raw queries against any registered SQL-capable database.

Base path: `/api/sql`

### Bridge Selection Priority

When `POST /api/sql/execute` is called, the database is selected by this priority:

1. **`bridge`** (highest priority) — key from `config/bridge.yml`, format `{type}.{instance}` (e.g. `timescaledb.main`). Connects directly to that external database.
2. **`database`** — name of a PostgreSQL database on the same API server host (e.g. `"logging"`, `"api"`). Routes to that DB in the `public` schema.
3. **Neither** — executes against the API database (`api`, `public` schema).

### Request Model: `SQLRequest`
```json
{
  "query": "SELECT * FROM workflow_runs LIMIT 10",
  "database": "logging",
  "bridge": null
}
```

| Field      | Type          | Description |
|------------|---------------|-------------|
| `query`    | `string`      | Raw SQL to execute |
| `database` | `string\|null` | Named database on the API server (e.g. `"logging"`, `"api"`) |
| `bridge`   | `string\|null` | Bridge key from `bridge.yml` (e.g. `"timescaledb.main"`, `"postgresql.main"`) |

### List Available SQL Bridges
```
GET /api/sql/bridges
```

Returns all SQL-capable bridges registered in `config/bridge.yml`.
Supported bridge types: `postgresql`, `timescaledb`, `supabase`.

Response:
```json
[
  {
    "key": "timescaledb.main",
    "type": "timescaledb",
    "instance": "main",
    "is_default": true
  },
  {
    "key": "postgresql.main",
    "type": "postgresql",
    "instance": "main",
    "is_default": false
  }
]
```

### Execute SQL
```
POST /api/sql/execute
```

Request body: `SQLRequest`
Response: `list[dict[str, Any]]` — array of row objects.

**Example — query the logging database:**
```json
{
  "query": "SELECT run_id, status, duration_ms FROM workflow_runs WHERE workflow_id = 'uuid' ORDER BY started_at DESC LIMIT 5",
  "database": "logging"
}
```

**Example — query TimescaleDB via bridge:**
```json
{
  "query": "SELECT time_bucket('1 hour', ts) AS bucket, AVG(value) FROM sensor_data GROUP BY bucket ORDER BY bucket DESC",
  "bridge": "timescaledb.main"
}
```

**Example — query the API database (default):**
```json
{
  "query": "SELECT id, value->>'name' AS name FROM workflows"
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400`  | Unknown bridge key or non-SQL bridge type |
| `503`  | Bridge connection failure |
| `500`  | Query execution error |

---

## Common Patterns for Agent Integration

### 1. Discover available workflows
```
GET /api/organizations/{org_id}/workflows?type=batch
```

### 2. Create a workflow with tables atomically
Send tables in the `WorkflowCreate` payload — they are created transactionally.

### 3. Query execution results
After a workflow runs, query its output via SQL:
```json
POST /api/sql/execute
{
  "query": "SELECT * FROM aggregated_events ORDER BY ts DESC LIMIT 100",
  "bridge": "timescaledb.main"
}
```

### 4. Monitor a workflow run
```
GET /api/organizations/{org_id}/workflows/{workflow_id}/runs
→ pick a run_id
GET /api/organizations/{org_id}/workflows/{workflow_id}/runs/{run_id}
→ activity-level detail
```

### 5. Trigger a workflow
```
POST /api/organizations/{org_id}/workflows/{workflow_id}/start
```

### 6. Inspect logging DB directly
```json
POST /api/sql/execute
{
  "query": "SELECT activity_name, AVG(duration_ms) FROM activity_logs WHERE workflow_id = 'uuid' GROUP BY activity_name",
  "database": "logging"
}
```

---

## Error Handling

All endpoints return standard HTTP status codes and a JSON error body:
```json
{ "detail": "Workflow not found" }
```

| Status | Meaning |
|--------|---------|
| `400`  | Bad request (validation, SQL bridge issue) |
| `401`  | Missing or invalid auth token |
| `404`  | Resource not found or does not belong to org |
| `503`  | External bridge connection failure |
| `500`  | Internal server error / query failure |

SQLAlchemy database errors are automatically caught and returned as `400` responses.
