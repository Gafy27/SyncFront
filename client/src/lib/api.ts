import type {
  Organization,
  Application,
  Machine,
  Connector,
  Gateway,
  Pipeline,
  PipelineRule,
  Workflow,
  WorkflowTable,
  EventClass,
  User,
  Service,
  ConnectorTemplate,
  OrgStats,
  AppStats,
  AuthUser,
} from "./types";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8001";

// ─── Generic Fetch Helpers ──────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function get<T>(path: string) {
  return request<T>(path, { method: "GET" });
}

function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

function put<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

function del<T = void>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

// ─── SQL Execute ────────────────────────────────────────────

export async function executeSql<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await post<{ rows: T[] } | T[]>("/api/sql/execute", {
    query,
    params,
  });
  // Handle both { rows: [...] } and [...] shapes
  return Array.isArray(res) ? res : res.rows;
}

// ─── Auth / Current User ───────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    post<AuthUser>("/api/auth/login", { email, password }),
  me: () => get<AuthUser>("/api/users/me"),
  updateMe: (data: Partial<User>) =>
    put<User>("/api/users/me", data),
};

// ─── Organizations ──────────────────────────────────────────

export const organizations = {
  list: () => get<Organization[]>("/api/organizations"),
  get: (id: string) => get<Organization>(`/api/organizations/${id}`),
  create: (data: Partial<Organization>) =>
    post<Organization>("/api/organizations", data),
  update: (id: string, data: Partial<Organization>) =>
    put<Organization>(`/api/organizations/${id}`, data),
  delete: (id: string) => del(`/api/organizations/${id}`),
  stats: (id: string) => get<OrgStats>(`/api/organizations/${id}/stats`),
};

// ─── Services (Global) ─────────────────────────────────────

export const services = {
  list: () => get<Service[]>("/api/services"),
  get: (id: string) => get<Service>(`/api/services/${id}`),
  create: (data: Partial<Service>) => post<Service>("/api/services", data),
  update: (id: string, data: Partial<Service>) =>
    put<Service>(`/api/services/${id}`, data),
  delete: (id: string) => del(`/api/services/${id}`),
};

// ─── Connector Templates (Global) ──────────────────────────

export const connectorTemplates = {
  list: () => get<ConnectorTemplate[]>("/api/connector-templates"),
  get: (id: string) =>
    get<ConnectorTemplate>(`/api/connector-templates/${id}`),
};

// ─── Org-Scoped Users ──────────────────────────────────────

export const orgUsers = {
  list: (orgId: string) =>
    get<User[]>(`/api/organizations/${orgId}/users`),
  get: (orgId: string, userId: string) =>
    get<User>(`/api/organizations/${orgId}/users/${userId}`),
  create: (orgId: string, data: Partial<User>) =>
    post<User>(`/api/organizations/${orgId}/users`, data),
  update: (orgId: string, userId: string, data: Partial<User>) =>
    put<User>(`/api/organizations/${orgId}/users/${userId}`, data),
  delete: (orgId: string, userId: string) =>
    del(`/api/organizations/${orgId}/users/${userId}`),
};

// ─── Gateways ───────────────────────────────────────────────

export const gateways = {
  list: (orgId: string) =>
    get<Gateway[]>(`/api/organizations/${orgId}/gateways`),
  get: (orgId: string, gwId: string) =>
    get<Gateway>(`/api/organizations/${orgId}/gateways/${gwId}`),
  create: (orgId: string, data: Partial<Gateway>) =>
    post<Gateway>(`/api/organizations/${orgId}/gateways`, data),
  update: (orgId: string, gwId: string, data: Partial<Gateway>) =>
    put<Gateway>(`/api/organizations/${orgId}/gateways/${gwId}`, data),
  delete: (orgId: string, gwId: string) =>
    del(`/api/organizations/${orgId}/gateways/${gwId}`),
};

// ─── Applications ───────────────────────────────────────────

export const applications = {
  list: (orgId: string) =>
    get<Application[]>(`/api/organizations/${orgId}/applications`),
  get: (orgId: string, appId: string) =>
    get<Application>(
      `/api/organizations/${orgId}/applications/${appId}`
    ),
  create: (orgId: string, data: Partial<Application>) =>
    post<Application>(`/api/organizations/${orgId}/applications`, data),
  update: (orgId: string, appId: string, data: Partial<Application>) =>
    put<Application>(
      `/api/organizations/${orgId}/applications/${appId}`,
      data
    ),
  delete: (orgId: string, appId: string) =>
    del(`/api/organizations/${orgId}/applications/${appId}`),
  stats: (orgId: string, appId: string) =>
    get<AppStats>(
      `/api/organizations/${orgId}/applications/${appId}/stats`
    ),
};

// ─── Machines (Application-Scoped) ─────────────────────────

export const machines = {
  list: (orgId: string, appId: string) =>
    get<Machine[]>(
      `/api/organizations/${orgId}/applications/${appId}/machines`
    ),
  get: (orgId: string, appId: string, machineId: string) =>
    get<Machine>(
      `/api/organizations/${orgId}/applications/${appId}/machines/${machineId}`
    ),
  create: (orgId: string, appId: string, data: Partial<Machine>) =>
    post<Machine>(
      `/api/organizations/${orgId}/applications/${appId}/machines`,
      data
    ),
  update: (
    orgId: string,
    appId: string,
    machineId: string,
    data: Partial<Machine>
  ) =>
    put<Machine>(
      `/api/organizations/${orgId}/applications/${appId}/machines/${machineId}`,
      data
    ),
  delete: (orgId: string, appId: string, machineId: string) =>
    del(
      `/api/organizations/${orgId}/applications/${appId}/machines/${machineId}`
    ),
};

// ─── Connectors (Application-Scoped) ───────────────────────

export const connectors = {
  list: (orgId: string, appId: string) =>
    get<Connector[]>(
      `/api/organizations/${orgId}/applications/${appId}/connectors`
    ),
  get: (orgId: string, appId: string, connId: string) =>
    get<Connector>(
      `/api/organizations/${orgId}/applications/${appId}/connectors/${connId}`
    ),
  create: (orgId: string, appId: string, data: Partial<Connector>) =>
    post<Connector>(
      `/api/organizations/${orgId}/applications/${appId}/connectors`,
      data
    ),
  update: (
    orgId: string,
    appId: string,
    connId: string,
    data: Partial<Connector>
  ) =>
    put<Connector>(
      `/api/organizations/${orgId}/applications/${appId}/connectors/${connId}`,
      data
    ),
  delete: (orgId: string, appId: string, connId: string) =>
    del(
      `/api/organizations/${orgId}/applications/${appId}/connectors/${connId}`
    ),
};

// ─── Event Classes (Application-Scoped) ────────────────────

export const eventClasses = {
  list: (orgId: string, appId: string) =>
    get<EventClass[]>(
      `/api/organizations/${orgId}/applications/${appId}/event-classes`
    ),
  get: (orgId: string, appId: string, ecId: string) =>
    get<EventClass>(
      `/api/organizations/${orgId}/applications/${appId}/event-classes/${ecId}`
    ),
  create: (orgId: string, appId: string, data: Partial<EventClass>) =>
    post<EventClass>(
      `/api/organizations/${orgId}/applications/${appId}/event-classes`,
      data
    ),
  bulkReplace: (orgId: string, appId: string, data: Partial<EventClass>[]) =>
    put<EventClass[]>(
      `/api/organizations/${orgId}/applications/${appId}/event-classes`,
      data
    ),
  delete: (orgId: string, appId: string, ecId: string) =>
    del(
      `/api/organizations/${orgId}/applications/${appId}/event-classes/${ecId}`
    ),
};

// ─── Pipelines (Application-Scoped) ────────────────────────

export const pipelines = {
  list: (orgId: string, appId: string) =>
    get<Pipeline[]>(
      `/api/organizations/${orgId}/applications/${appId}/pipelines`
    ),
  get: (orgId: string, appId: string, pipelineId: string) =>
    get<Pipeline>(
      `/api/organizations/${orgId}/applications/${appId}/pipelines/${pipelineId}`
    ),
  create: (orgId: string, appId: string, data: Partial<Pipeline>) =>
    post<Pipeline>(
      `/api/organizations/${orgId}/applications/${appId}/pipelines`,
      data
    ),
  update: (
    orgId: string,
    appId: string,
    pipelineId: string,
    data: Partial<Pipeline>
  ) =>
    put<Pipeline>(
      `/api/organizations/${orgId}/applications/${appId}/pipelines/${pipelineId}`,
      data
    ),
  delete: (orgId: string, appId: string, pipelineId: string) =>
    del(
      `/api/organizations/${orgId}/applications/${appId}/pipelines/${pipelineId}`
    ),
};

// ─── Pipeline Rules ─────────────────────────────────────────

export const pipelineRules = {
  list: (orgId: string, appId: string, pipelineId: string) =>
    get<PipelineRule[]>(
      `/api/organizations/${orgId}/applications/${appId}/pipelines/${pipelineId}/rules`
    ),
  get: (
    orgId: string,
    appId: string,
    pipelineId: string,
    ruleId: string
  ) =>
    get<PipelineRule>(
      `/api/organizations/${orgId}/applications/${appId}/pipelines/${pipelineId}/rules/${ruleId}`
    ),
  create: (
    orgId: string,
    appId: string,
    pipelineId: string,
    data: Partial<PipelineRule>
  ) =>
    post<PipelineRule>(
      `/api/organizations/${orgId}/applications/${appId}/pipelines/${pipelineId}/rules`,
      data
    ),
  update: (
    orgId: string,
    appId: string,
    pipelineId: string,
    ruleId: string,
    data: Partial<PipelineRule>
  ) =>
    put<PipelineRule>(
      `/api/organizations/${orgId}/applications/${appId}/pipelines/${pipelineId}/rules/${ruleId}`,
      data
    ),
  delete: (
    orgId: string,
    appId: string,
    pipelineId: string,
    ruleId: string
  ) =>
    del(
      `/api/organizations/${orgId}/applications/${appId}/pipelines/${pipelineId}/rules/${ruleId}`
    ),
};

// ─── Workflows (Organization-Scoped) ───────────────────────

export const workflows = {
  list: (orgId: string) =>
    get<Workflow[]>(`/api/organizations/${orgId}/workflows`),
  get: (orgId: string, workflowId: string) =>
    get<Workflow>(`/api/organizations/${orgId}/workflows/${workflowId}`),
  create: (orgId: string, data: Partial<Workflow>) =>
    post<Workflow>(`/api/organizations/${orgId}/workflows`, data),
  update: (orgId: string, workflowId: string, data: Partial<Workflow>) =>
    put<Workflow>(
      `/api/organizations/${orgId}/workflows/${workflowId}`,
      data
    ),
  delete: (orgId: string, workflowId: string) =>
    del(`/api/organizations/${orgId}/workflows/${workflowId}`),
};

// ─── Workflow Tables ────────────────────────────────────────

export const workflowTables = {
  list: (orgId: string, workflowId: string) =>
    get<WorkflowTable[]>(
      `/api/organizations/${orgId}/workflows/${workflowId}/tables`
    ),
  get: (orgId: string, workflowId: string, tableId: string) =>
    get<WorkflowTable>(
      `/api/organizations/${orgId}/workflows/${workflowId}/tables/${tableId}`
    ),
  create: (
    orgId: string,
    workflowId: string,
    data: Partial<WorkflowTable>
  ) =>
    post<WorkflowTable>(
      `/api/organizations/${orgId}/workflows/${workflowId}/tables`,
      data
    ),
  update: (
    orgId: string,
    workflowId: string,
    tableId: string,
    data: Partial<WorkflowTable>
  ) =>
    put<WorkflowTable>(
      `/api/organizations/${orgId}/workflows/${workflowId}/tables/${tableId}`,
      data
    ),
  delete: (orgId: string, workflowId: string, tableId: string) =>
    del(
      `/api/organizations/${orgId}/workflows/${workflowId}/tables/${tableId}`
    ),
};
