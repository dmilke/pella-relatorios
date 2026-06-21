import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSpreadsheet,
  ClipboardList,
  Settings,
  FileText,
  LogOut,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { Badge } from './ui/Badge'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Painel', profiles: ['admin', 'apoio', 'analista', 'profissional'] },
  { to: '/lancamento', icon: FileSpreadsheet, label: 'Lançamento', profiles: ['admin', 'apoio', 'profissional'] },
  { to: '/relatorios', icon: FileText, label: 'Relatórios', profiles: ['admin', 'analista'] },
  { to: '/admin', icon: Settings, label: 'Administração', profiles: ['admin'] },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { hasProfile } = usePermission()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('notificacoes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `usuario_id=eq.${user.id}` },
        () => setNotifCount((c) => c + 1)
      )
      .subscribe()

    supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', user.id)
      .eq('lida', false)
      .then(({ count }) => setNotifCount(count ?? 0))

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const visibleItems = navItems.filter((item) =>
    item.profiles.some((p) => hasProfile(p as any))
  )

  return (
    <aside className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold text-lg">
          P
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Pella</h1>
          <p className="text-xs text-gray-500">Sistema de Relatórios</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 px-3 py-4">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary text-sm font-semibold">
              {user?.nome_completo?.charAt(0) ?? ''}
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 truncate max-w-[140px]">{user?.nome_completo}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.perfil}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
