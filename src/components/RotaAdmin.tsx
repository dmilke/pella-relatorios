import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function RotaAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  if (!user || user.perfil !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
