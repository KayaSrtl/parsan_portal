import { useCallback } from 'react';
import { apiFetch, toFormData } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useApiResource } from './useApiResource';

/** Hata kartlarını yükler ve ekleme/güncelleme/silme işlemlerini sağlar. */
export function useIssues() {
  const { token } = useAuth();
  const {
    data: issues,
    loading,
    error,
    refresh,
  } = useApiResource('/issues', { enabled: Boolean(token) });

  const addIssue = useCallback(
    async (issueData, imageFile) => {
      await apiFetch('/issues', {
        method: 'POST',
        body: toFormData(issueData, { image: imageFile }),
      });
      await refresh();
    },
    [refresh]
  );

  const updateIssue = useCallback(
    async (id, updatedData, newImageFile) => {
      await apiFetch(`/issues/${id}`, {
        method: 'PUT',
        body: toFormData(updatedData, { image: newImageFile }),
      });
      await refresh();
    },
    [refresh]
  );

  const deleteIssue = useCallback(
    async (id) => {
      await apiFetch(`/issues/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh]
  );

  return { issues, loading, error, addIssue, updateIssue, deleteIssue, refresh };
}
