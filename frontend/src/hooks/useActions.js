import { useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useApiResource } from './useApiResource';

/** Aksiyon modülünün verisini yönetir. */
export function useActions() {
  const { user } = useAuth();
  const {
    data: actions,
    loading,
    error,
    refresh,
  } = useApiResource('/actions', { enabled: Boolean(user) });

  const addAction = useCallback(
    async (actionData) => {
      const created = await apiFetch('/actions', { method: 'POST', body: actionData });
      await refresh();
      return created;
    },
    [refresh]
  );

  const updateAction = useCallback(
    async (id, actionData) => {
      const updated = await apiFetch(`/actions/${id}`, { method: 'PUT', body: actionData });
      await refresh();
      return updated;
    },
    [refresh]
  );

  const deleteAction = useCallback(
    async (id) => {
      await apiFetch(`/actions/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh]
  );

  return { actions, loading, error, addAction, updateAction, deleteAction, refresh };
}
