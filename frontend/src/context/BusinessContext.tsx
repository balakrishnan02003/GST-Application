import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessApi } from '../lib/api';
import type { Business } from '../types';
import { useAuth } from './AuthContext';

interface BusinessContextValue {
  businesses: Business[];
  activeBusiness: Business | null;
  setActiveBusinessId: (id: string) => void;
  isLoading: boolean;
  refetch: () => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem('activeBusinessId'),
  );

  const { data: businesses = [], isLoading, refetch } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.list,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (businesses.length > 0 && !activeId) {
      setActiveId(businesses[0].id);
      localStorage.setItem('activeBusinessId', businesses[0].id);
    }
  }, [businesses, activeId]);

  const activeBusiness = businesses.find((b) => b.id === activeId) ?? businesses[0] ?? null;

  const value = useMemo(
    () => ({
      businesses,
      activeBusiness,
      setActiveBusinessId: (id: string) => {
        setActiveId(id);
        localStorage.setItem('activeBusinessId', id);
      },
      isLoading,
      refetch,
    }),
    [businesses, activeBusiness, isLoading, refetch],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
