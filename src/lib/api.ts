import type {
  Organization,
  Bridge,
  Machine,
  OrgEvent,
  Workflow,
  WorkflowTable,
  User,
  Service,
  ConnectorTemplate,
  OrgStats,
  AuthUser,
} from "./types";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8001";

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

// ─── Generic Fetch Helpers ──────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    const body = await res.text().catch(() => "");
    try {
      const json = JSON.parse(body);
      if (json.detail) {
        const detail = typeof json.detail === "string"
          ? json.detail
          : Array.isArray(json.detail)
            ? json.detail.map((e: { msg?: string; loc?: string[] }) =>
                [e.loc?.slice(1).join("."), e.msg].filter(Boolean).join(": ")
              ).join(" | ")
            : JSON.stringify(json.detail);
        throw new Error(detail);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== body) throw e;
    }
    throw new Error(body || res.statusText);
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

export async function executeQuery(
  query: string,
  orgId: string
): Promise<Record<string, unknown>[]> {
  const res = await post<{ rows: Record<string, unknown>[] } | Record<string, unknown>[]>(
    "/api/sql/execute",
    { query, org_id: orgId }
  );
  return Array.isArray(res) ? res : res.rows;
}

// ─── Auth / Current User ───────────────────────────────────

export const auth = {
  login: async (username: string, password: string): Promise<AuthUser> => {
    const res = await request<any>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }).toString(),
    });
    const token = res.access_token ?? res.token;
    if (token) setAuthToken(token);
    return res;
  },
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

// ─── Bridges (Org-Scoped) ───────────────────────────────────

export const bridges = {
  list: (orgId: string) =>
    get<Bridge[]>(`/api/organizations/${orgId}/bridges`),
  get: (orgId: string, bridgeId: string) =>
    get<Bridge>(`/api/organizations/${orgId}/bridges/${bridgeId}`),
  create: (orgId: string, data: Partial<Bridge>) =>
    post<Bridge>(`/api/organizations/${orgId}/bridges`, data),
  update: (orgId: string, bridgeId: string, data: Partial<Bridge>) =>
    put<Bridge>(`/api/organizations/${orgId}/bridges/${bridgeId}`, data),
  delete: (orgId: string, bridgeId: string) =>
    del(`/api/organizations/${orgId}/bridges/${bridgeId}`),
};

// ─── Machines (Org-Scoped) ─────────────────────────────────

export const machines = {
  list: (orgId: string) =>
    get<Machine[]>(`/api/organizations/${orgId}/machines`),
  get: (orgId: string, machineId: string) =>
    get<Machine>(`/api/organizations/${orgId}/machines/${machineId}`),
  create: (orgId: string, data: Partial<Machine>) =>
    post<Machine>(`/api/organizations/${orgId}/machines`, data),
  update: (orgId: string, machineId: string, data: Partial<Machine>) =>
    put<Machine>(`/api/organizations/${orgId}/machines/${machineId}`, data),
  delete: (orgId: string, machineId: string) =>
    del(`/api/organizations/${orgId}/machines/${machineId}`),
};

// ─── Events (Org-Scoped) ────────────────────────────────────

export const events = {
  list: (orgId: string) =>
    get<OrgEvent[]>(`/api/organizations/${orgId}/events`),
  get: (orgId: string, eventId: string) =>
    get<OrgEvent>(`/api/organizations/${orgId}/events/${eventId}`),
  create: (orgId: string, data: Partial<OrgEvent>) =>
    post<OrgEvent>(`/api/organizations/${orgId}/events`, data),
  bulkReplace: (orgId: string, data: Partial<OrgEvent>[]) =>
    put<OrgEvent[]>(`/api/organizations/${orgId}/events`, data),
  update: (orgId: string, eventId: string, data: Partial<OrgEvent>) =>
    put<OrgEvent>(`/api/organizations/${orgId}/events/${eventId}`, data),
  delete: (orgId: string, eventId: string) =>
    del(`/api/organizations/${orgId}/events/${eventId}`),
};

// ─── Workflows (Org-Scoped) ────────────────────────────────

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
  create: (orgId: string, workflowId: string, data: Partial<WorkflowTable>) =>
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
