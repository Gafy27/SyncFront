import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useImportYaml() {
  return useMutation({
    mutationFn: async (yamlContent: string) => {
      const res = await fetch(api.yaml.import.path, {
        method: api.yaml.import.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yamlContent }),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.yaml.import.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to import YAML");
      }
      return api.yaml.import.responses[200].parse(await res.json());
    },
  });
}

export function useExportYaml() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.yaml.export.path, {
        method: api.yaml.export.method,
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to export YAML");
      return api.yaml.export.responses[200].parse(await res.json());
    },
  });
}
