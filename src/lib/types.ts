// ─── Global Resources ───────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserOrganization {
  user_id: string;
  organization_id: string;
  role: string; // "owner" | "admin" | "viewer"
}

export interface Service {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConnectorTemplate {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  version?: string;
  is_active?: boolean;
  variables?: Record<string, unknown> | { name: string; type: string; label: string; required?: boolean; default?: unknown }[];
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Tenant (Organization-Scoped) Resources ────────────────

/** Bridge: a configured connection instance (MQTT broker, OPC-UA server, etc.) */
export interface Bridge {
  id: string;
  name: string;
  type?: string;
  /** Fields common to all environments */
  base?: Record<string, unknown>;
  /** Per-environment field overrides */
  variants?: Record<string, Record<string, unknown>>;
  is_default?: boolean;
  is_enabled?: boolean;
  template_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

/** Machine: a device/machine scoped directly to an organization */
export interface Machine {
  id: string;
  name: string;
  /** Bridge names this machine uses */
  bridges?: string[];
  /** Driver connector instances attached to this machine */
  connectors?: { template_id: string; config?: Record<string, unknown> }[];
  /** Event names this machine can emit */
  events?: string[];
  properties?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Event: an event type defined at the organization level */
export interface OrgEvent {
  id?: string;
  event: string;        // event identifier/name (e.g. "power", "temperature")
  topic?: string;       // MQTT topic or similar
  type?: string;        // data type e.g. "FLOAT", "INT", "BOOL"
  values_range?: number[];
  auth_values?: string[];
  authenticate?: boolean;
  is_counter?: boolean;
  remove_duplicates?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Window config for batch workflows */
export interface WindowConfig {
  type: string;        // "tumbling" | "sliding" | "stepping"
  size?: string;       // e.g. "30m", "1h"
  triggers?: string[];
}

/** Workflow: streaming or batch, stored in same table discriminated by type */
export interface Workflow {
  id: string;
  name: string;
  /** "stream" (real-time, event-driven) or "batch" (windowed/scheduled) */
  type: "stream" | "batch";
  /** Streaming only: event names that trigger processing */
  triggers?: string[];
  /** Batch only: window schedule config */
  window?: WindowConfig;
  description?: string | null;
  is_enabled?: boolean;
  tables?: WorkflowTable[];
  tables_count?: number;
  last_executed?: string | null;
  executions_last_24h?: number;
  created_at?: string;
  updated_at?: string;
}

/** Table step inside a workflow */
export interface WorkflowTable {
  id: string;
  name?: string;
  upsert_constraints?: string[];
  time_column?: string | null;
  /** Streaming: SQL/Python applied to each incoming event */
  type?: string;        // "sql" | "python"
  definition?: string;
  publish?: boolean;
  memory?: boolean;
  /** Batch: function definition */
  function?: {
    type: string;
    definition: string;
  };
  order?: number;
  created_at?: string;
  updated_at?: string;
}

/** Payload to create a workflow */
export interface WorkflowCreatePayload {
  name: string;
  type: "stream" | "batch";
  triggers?: string[];
  window?: WindowConfig;
  description?: string | null;
  is_enabled?: boolean;
  tables?: unknown[];
}

// ─── API Response Shapes ────────────────────────────────────

export interface SqlExecuteResponse {
  rows: Record<string, unknown>[];
  rowCount?: number;
}

export interface OrgStats {
  machines_count?: number;
  bridges_count?: number;
  events_count?: number;
  workflows_count?: number;
}

export interface AuthUser extends User {
  organizations: (UserOrganization & { organization_name?: string })[];
}
