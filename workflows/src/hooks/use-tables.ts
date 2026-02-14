import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateTableRequest, type UpdateTableRequest } from "@shared/routes";

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTableRequest) => {
      const res = await fetch(api.tables.create.path, {
        method: api.tables.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.tables.create.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to create table");
      }
      return api.tables.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.workflows.get.path, data.workflowId] 
      });
      // Also invalidate list if needed, depending on where it's used
      queryClient.invalidateQueries({ queryKey: [api.workflows.list.path] });
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workflowId, ...data }: { id: number; workflowId: number } & UpdateTableRequest) => {
      const url = buildUrl(api.tables.update.path, { id });
      const res = await fetch(url, {
        method: api.tables.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update table");
      return api.tables.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.workflows.get.path, data.workflowId] 
      });
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workflowId }: { id: number; workflowId: number }) => {
      const url = buildUrl(api.tables.delete.path, { id });
      const res = await fetch(url, {
        method: api.tables.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete table");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.workflows.get.path, variables.workflowId] 
      });
    },
  });
}
