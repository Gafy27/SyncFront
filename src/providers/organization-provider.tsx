import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { organizations as orgsApi } from "@/lib/api";
import type { Organization } from "@/lib/types";

interface OrganizationContextValue {
  organizations: Organization[];
  selectedOrg: string | null;
  currentOrg: Organization | null;
  setSelectedOrg: (value: string) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "selected-organization";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const {
    data: organizationList = [],
    isLoading,
  } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: () => orgsApi.list(),
  });

  const [selectedOrg, setSelectedOrgState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  // Auto-select first org when list loads and nothing is selected (or stored org doesn't exist)
  useEffect(() => {
    if (organizationList.length > 0) {
      const stored = localStorage.getItem(STORAGE_KEY);
      const exists = organizationList.some((o) => o.id === stored);
      if (!stored || !exists) {
        const firstId = organizationList[0].id;
        setSelectedOrgState(firstId);
        localStorage.setItem(STORAGE_KEY, firstId);
      }
    }
  }, [organizationList]);

  const setSelectedOrg = (value: string) => {
    setSelectedOrgState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const currentOrg = useMemo(
    () => organizationList.find((o) => o.id === selectedOrg) ?? null,
    [organizationList, selectedOrg]
  );

  const value = useMemo(
    () => ({
      organizations: organizationList,
      selectedOrg,
      currentOrg,
      setSelectedOrg,
      isLoading,
    }),
    [organizationList, selectedOrg, currentOrg, isLoading]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
