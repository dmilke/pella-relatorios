import { useAuth } from './useAuth'
import type { PerfilUsuario } from '@/types'

export function usePermission() {
  const { user } = useAuth()

  function hasProfile(...profiles: PerfilUsuario[]): boolean {
    if (!user) return false
    return profiles.includes(user.perfil)
  }

  function isAdmin(): boolean {
    return hasProfile('admin')
  }

  function isApoio(): boolean {
    return hasProfile('apoio')
  }

  function isAdminOrApoio(): boolean {
    return hasProfile('admin', 'apoio')
  }

  function canManageUsers(): boolean {
    return isAdmin()
  }

  function canManageCatalog(): boolean {
    return isAdmin()
  }

  function canViewAllRecords(): boolean {
    return hasProfile('admin', 'analista', 'apoio')
  }

  return {
    user,
    hasProfile,
    isAdmin,
    isApoio,
    isAdminOrApoio,
    canManageUsers,
    canManageCatalog,
    canViewAllRecords,
  }
}
