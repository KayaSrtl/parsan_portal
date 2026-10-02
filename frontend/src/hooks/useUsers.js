import { useAuth } from '../contexts/AuthContext';
import { isManager } from '../lib/constants';
import { useApiResource } from './useApiResource';

/**
 * Kullanıcı listesini getirir. Bu uca yalnızca yönetici rolleri erişebildiği
 * için diğer kullanıcılarda hiç istek atılmaz (gereksiz 403 olmasın).
 */
export function useUsers() {
  const { user } = useAuth();
  const {
    data: users,
    loading,
    error,
    refresh,
  } = useApiResource('/users', { enabled: isManager(user) });

  return { users, loading, error, refresh };
}
