import { QueryClient } from "@tanstack/react-query";
import { API_BASE_URL, getAuthToken } from "./api";

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  if (import.meta.env.DEV) {
    console.log("[API]", method, url);
  }
  const token = getAuthToken();
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});