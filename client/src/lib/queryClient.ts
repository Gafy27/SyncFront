import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getDemoInterceptor } from "@/providers/demo-interceptor-provider";
import { Alert } from "@/components/ui/alert";

// Use relative URL if VITE_API_URL is not set, allowing the frontend server to proxy requests
// Otherwise use the configured API URL (can be localhost for local dev, or public IP/domain for external access)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      // If we can't read the response, use statusText
    }
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

// Check if demo mode is enabled
// Priority: 1. Runtime window variable (from server), 2. Build-time env var, 3. localStorage, 4. window variable, 5. default (true)
function isDemoModeEnabled(): boolean {
  // Check runtime window variable first (injected by server from VITE_DEMO_MODE env var)
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_DEMO_MODE__ !== undefined) {
    return (window as any).__RUNTIME_DEMO_MODE__ === true;
  }
  
  // Check build-time environment variable
  const envValue = import.meta.env.VITE_DEMO_MODE;
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  
  // Check localStorage
  if (typeof window !== 'undefined') {
    const localStorageValue = localStorage.getItem('demoModeEnabled');
    if (localStorageValue !== null) {
      return localStorageValue === 'true';
    }
    
    // Check window global variable (can be set from console)
    if ((window as any).__DEMO_MODE_ENABLED !== undefined) {
      return (window as any).__DEMO_MODE_ENABLED === true;
    }
  }
  
  // Default: enabled (demo mode on)
  return true;
}

// Expose function to toggle demo mode from console
if (typeof window !== 'undefined') {
  (window as any).toggleDemoMode = (enabled?: boolean) => {
    if (enabled === undefined) {
      // Toggle
      const current = isDemoModeEnabled();
      const newValue = !current;
      localStorage.setItem('demoModeEnabled', String(newValue));
      (window as any).__DEMO_MODE_ENABLED = newValue;
      console.log(`Demo mode ${newValue ? 'ENABLED' : 'DISABLED'}`);
      return newValue;
    } else {
      // Set specific value
      localStorage.setItem('demoModeEnabled', String(enabled));
      (window as any).__DEMO_MODE_ENABLED = enabled;
      console.log(`Demo mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
      return enabled;
    }
  };
  
  // Expose function to check current status
  (window as any).getDemoModeStatus = () => {
    const enabled = isDemoModeEnabled();
    console.log(`Demo mode is currently: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    return enabled;
  };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const writeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  // Only show demo dialog if demo mode is enabled
  if (isDemoModeEnabled() && writeMethods.includes(method.toUpperCase())) {
    const showDemoDialog = getDemoInterceptor();
    if (showDemoDialog) {
      const shouldProceed = await showDemoDialog(method, url);
      // If demo mode is enabled and user clicked "Entendido", block the request
      if (!shouldProceed) {
        throw new Error('Modo Demo: No se puede realizar la acción');
      }
    }
  }

  // If API_BASE_URL is empty, use relative URL (proxy through frontend server)
  // Otherwise use the full URL
  const fullUrl = url.startsWith('http') 
    ? url 
    : API_BASE_URL 
      ? `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
      : url.startsWith('/') ? url : `/${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/") as string;
    // If API_BASE_URL is empty, use relative URL (proxy through frontend server)
    // Otherwise use the full URL
    const url = path.startsWith('http') 
      ? path 
      : API_BASE_URL 
        ? `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
        : path.startsWith('/') ? path : `/${path}`;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
