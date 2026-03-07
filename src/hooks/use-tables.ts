import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useOrganization } from "@/providers/organization-provider";
import type { UpdateTableRequest } from "@/lib/schema";
import type { WorkflowTable } from "@/lib/types";

function normalizeTables(res: unknown): WorkflowTable[] {
  if (Array.isArray(res)) return res as WorkflowTable[];
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    if (Array.isArray(o.tables)) return o.tables as WorkflowTable[];
    if (Array.isArray(o.data)) return o.data as WorkflowTable[];
    if (Array.isArray(o.items)) return o.items as WorkflowTable[];
  }
  return [];
}

export function useFetchTables(workflowId: string | null) {
  const { selectedOrg } = useOrganization();
  return useQuery({
    queryKey: ["organizations", selectedOrg, "workflows", workflowId, "tables"],
    queryFn: async () => {
      if (!selectedOrg || !workflowId) return [];
      const res = await apiRequest<unknown>("GET", `/api/organizations/${selectedOrg}/workflows/${workflowId}/tables`);
      return normalizeTables(res);
    },
    enabled: !!selectedOrg && !!workflowId,
  });
}

export type CreateTablePayload = {
  workflowId: number | string;
  workflowType: "stream" | "batch";
  name: string;
  // Streaming fields
  type?: string;          // "sql" | "python"
  definition?: string;
  publish?: boolean;
  memory?: boolean;
  // Batch fields
  functionType?: string;  // "sql" | "python"
  upsertConstraints?: string[];
  timeColumn?: string;
};

function buildTableCreateBody(data: CreateTablePayload) {
  if (data.workflowType === "batch") {
    const body: Record<string, unknown> = {
      name: data.name,
      function: {
        type: data.functionType || "sql",
        definition: data.definition || "",
      },
    };
    if (data.upsertConstraints && data.upsertConstraints.length > 0) {
      // API uses the typo "upsert_constrains"
      body.upsert_constrains = data.upsertConstraints;
    }
    if (data.timeColumn) {
      body.time_column = data.timeColumn;
    }
    return body;
  }
  // Streaming: uses function object same as batch
  return {
    name: data.name,
    function: {
      type: data.type || "sql",
      definition: data.definition || "",
    },
    publish: data.publish ?? true,
    memory: data.memory ?? false,
  };
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  const { selectedOrg } = useOrganization();

  return useMutation({
    mutationFn: async (data: CreateTablePayload) => {
      if (!selectedOrg) throw new Error("Organization required");
      const { workflowId } = data;
      if (workflowId == null || workflowId === "" || String(workflowId) === "undefined") {
        throw new Error("Workflow ID is required");
      }
      const path = `/api/organizations/${selectedOrg}/workflows/${workflowId}/tables`;
      const body = buildTableCreateBody(data);
      return apiRequest("POST", path, body);
    },
    onSuccess: (_, variables) => {
      if (selectedOrg) {
        queryClient.invalidateQueries({
          queryKey: ["organizations", selectedOrg, "workflows", variables.workflowId, "tables"],
        });
        queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "workflows"] });
      }
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  const { selectedOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({
      id,
      workflowId,
      workflowType,
      definition,
      type,
      ...rest
    }: {
      id: string;
      workflowId: string;
      workflowType?: "stream" | "batch";
      definition?: string;
      type?: string;
    } & Partial<UpdateTableRequest>) => {
      if (!selectedOrg) throw new Error("Organization required");
      const path = `/api/organizations/${selectedOrg}/workflows/${workflowId}/tables/${id}`;
      const body: Record<string, unknown> = { ...rest };
      // Both streaming and batch wrap definition/type inside a function object
      body.function = {
        type: type ?? "sql",
        ...(definition !== undefined ? { definition } : {}),
      };
      return apiRequest("PUT", path, body);
    },
    onSuccess: (_, variables) => {
      if (selectedOrg) {
        queryClient.invalidateQueries({
          queryKey: ["organizations", selectedOrg, "workflows", variables.workflowId, "tables"],
        });
      }
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  const { selectedOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, workflowId }: { id: string; workflowId: string }) => {
      if (!selectedOrg) throw new Error("Organization required");
      const path = `/api/organizations/${selectedOrg}/workflows/${workflowId}/tables/${id}`;
      return apiRequest("DELETE", path);
    },
    onSuccess: (_, variables) => {
      if (selectedOrg) {
        queryClient.invalidateQueries({
          queryKey: ["organizations", selectedOrg, "workflows", variables.workflowId, "tables"],
        });
      }
    },
  });
}
