import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface Organization {
  id: string;
  name: string;
}

interface OrganizationContextValue {
  organizations: Organization[];
  selectedOrg: string | null;
  setSelectedOrg: (value: string) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

const STORAGE_KEY = "selected-organization";

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
  });

  const [selectedOrg, setSelectedOrgState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (organizations.length > 0 && !selectedOrg) {
      setSelectedOrgState(organizations[0].id);
      localStorage.setItem(STORAGE_KEY, organizations[0].id);
    }
  }, [organizations, selectedOrg]);

  const setSelectedOrg = (value: string) => {
    setSelectedOrgState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const value = useMemo(
    () => ({
      organizations,
      selectedOrg,
      setSelectedOrg,
      isLoading,
    }),
    [organizations, selectedOrg, isLoading]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}

