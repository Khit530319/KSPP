// frontend/src/hooks/useApi.js
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

// Generic fetcher hook
export function useFetch(path, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await api.get(path)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => { fetch(); }, [fetch, ...deps]);
  return { data, loading, error, refetch: fetch };
}

// Dashboard
export const useDashboard  = () => useFetch('/dashboard');
export const useColdRoom   = () => useFetch('/cold-room');

// Inventory
export const useRawMaterials = (status) =>
  useFetch(`/inventory/raw-materials${status ? `?status=${status}` : ''}`);
export const useProducts = (category, status) => {
  const q = [category&&`category=${category}`, status&&`status=${status}`]
    .filter(Boolean).join('&');
  return useFetch(`/inventory/products${q ? '?'+q : ''}`);
};

// Production
export const useWorkOrders = (status, date) => {
  const q = [status&&`status=${status}`, date&&`date=${date}`]
    .filter(Boolean).join('&');
  return useFetch(`/production${q ? '?'+q : ''}`);
};

// Quality
export const useQCRecords   = () => useFetch('/quality/qc');
export const useLossRecords  = (from, to) =>
  useFetch(`/quality/loss${from ? `?from_date=${from}&to_date=${to||from}` : ''}`);
export const useLossSummary  = () => useFetch('/quality/loss/summary');
export const useShortfalls   = (status) =>
  useFetch(`/quality/shortfalls${status ? `?status=${status}` : ''}`);

// Orders
export const useSalesOrders = (status) =>
  useFetch(`/orders${status ? `?status=${status}` : ''}`);
export const useCustomers   = () => useFetch('/customers');
export const useSuppliers   = () => useFetch('/suppliers');

// Finance
export const useFinanceSummary = () => useFetch('/finance/summary');
export const useAPInvoices     = (status) =>
  useFetch(`/finance/ap${status ? `?status=${status}` : ''}`);
export const useARInvoices     = (status) =>
  useFetch(`/finance/ar${status ? `?status=${status}` : ''}`);
export const useFinancePerms   = () => useFetch('/finance/permissions');

// Users
export const useUsers     = () => useFetch('/users');
export const useAuditLogs = () => useFetch('/users/audit-logs');

// Imports
export const useImports = () => useFetch('/imports');

// Mutation hook
export function useMutation(apiFn) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true); setError(null);
    try {
      const result = await apiFn(...args);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  return { mutate, loading, error };
}
