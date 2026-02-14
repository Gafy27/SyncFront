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
  slug?: string;
  driver?: string;
  type: string; // "edge" | "cloud"
  version?: string;
  is_active?: boolean;
  collections?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ─── Tenant (Organization-Scoped) Resources ────────────────

export interface Application {
  id: string;
  organization_id?: string;
  name: string;
  slug: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Gateway {
  id: string;
  organization_id?: string;
  name: string;
  status: string;
  host?: string;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Machine {
  id: string;
  application_id?: string;
  name: string;
  status: string;
  type?: string;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Connector {
  id: string;
  application_id?: string;
  template_id?: string;
  name: string;
  driver?: string;
  status: string;
  collections?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface EventClass {
  id: string;
  application_id?: string;
  name?: string;
  className?: string;
  topic?: string;
  type?: string;
  auth_values?: string[];
  values_range?: number[];
  schema?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Pipeline {
  id: string;
  application_id?: string;
  name: string;
  triggers?: string[];
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PipelineRule {
  id: string;
  pipeline_id?: string;
  name: string;
  type: string; // "sql" | "python"
  definition: string;
  publish?: boolean;
  order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Workflow {
  id: string;
  organization_id?: string;
  application_id?: string;
  name: string;
  task_queue?: string;
  window?: {
    type: string;
    triggers: string[];
  };
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowTable {
  id: string;
  workflow_id?: string;
  name: string;
  upsert_constraints?: string[];
  function?: {
    type: string;
    definition: string;
  };
  order?: number;
  created_at?: string;
  updated_at?: string;
}

// ─── API Response Shapes ────────────────────────────────────

export interface SqlExecuteResponse {
  rows: Record<string, unknown>[];
  rowCount?: number;
}

export interface OrgStats {
  applications_count: number;
  machines_count: number;
  connectors_count: number;
  gateways_count: number;
  pipelines_count: number;
  workflows_count: number;
}

export interface AppStats {
  machines_count: number;
  connectors_count: number;
  event_classes_count: number;
  pipelines_count: number;
}

export interface AuthUser extends User {
  organizations: (UserOrganization & { organization_name?: string })[];
}
