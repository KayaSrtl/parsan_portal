import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { AREAS, DEPARTMENTS } from '../lib/constants';

export const CATALOG_UPDATED_EVENT = 'parsan:catalog-updated';

export const notifyCatalogUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATALOG_UPDATED_EVENT));
  }
};

/**
 * Tezgah/alan ve bölüm kataloglarını API'den paralel olarak yükler.
 * Hata durumunda veya boş listede sabit AREAS / DEPARTMENTS fallback'ini döner.
 * CATALOG_UPDATED_EVENT tetiklendiğinde listeleri otomatik tazeler.
 */
export function useCatalog() {
  const { token } = useAuth();
  const [machines, setMachines] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const reqIdRef = useRef(0);

  const loadData = useCallback(async (activeToken) => {
    const reqId = ++reqIdRef.current;

    if (!activeToken) {
      return { reqId, empty: true };
    }

    const [machinesRes, departmentsRes] = await Promise.allSettled([
      apiFetch('/machines'),
      apiFetch('/departments'),
    ]);

    return { reqId, empty: false, machinesRes, departmentsRes };
  }, []);

  const applyResult = useCallback((result) => {
    if (!result || result.reqId !== reqIdRef.current) return;
    if (result.empty) {
      setMachines([]);
      setDepartments([]);
      setLoading(false);
      return;
    }
    if (result.machinesRes?.status === 'fulfilled' && Array.isArray(result.machinesRes.value)) {
      setMachines(result.machinesRes.value);
    }
    if (
      result.departmentsRes?.status === 'fulfilled' &&
      Array.isArray(result.departmentsRes.value)
    ) {
      setDepartments(result.departmentsRes.value);
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    if (token) setLoading(true);
    try {
      const result = await loadData(token);
      applyResult(result);
    } catch {
      setLoading(false);
    }
  }, [token, loadData, applyResult]);

  useEffect(() => {
    let active = true;
    loadData(token)
      .then((result) => {
        if (active) applyResult(result);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadData, applyResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleUpdated = () => {
      refresh();
    };
    window.addEventListener(CATALOG_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(CATALOG_UPDATED_EVENT, handleUpdated);
  }, [refresh]);

  const machineNames = useMemo(
    () => (machines.length ? machines.map((m) => m.name) : AREAS),
    [machines]
  );

  const departmentNames = useMemo(
    () => (departments.length ? departments.map((d) => d.name) : DEPARTMENTS),
    [departments]
  );

  return {
    machines,
    machineNames,
    departments,
    departmentNames,
    loading,
    refresh,
  };
}
