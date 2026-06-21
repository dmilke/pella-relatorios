import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarMesAno } from '@/lib/utils'
import { Loading } from '@/components/ui/Loading'
import { Users, Accessibility, Briefcase, Activity } from 'lucide-react'

interface Indicadores {
  total_idosos: number
  total_pcd: number
  total_colaboradores: number
  total_atendimentos: number
  total_registros: number
}

interface MesData {
  mes: number
  ano: number
  total: number
}

export function Dashboard() {
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [historico, setHistorico] = useState<MesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const hoje = new Date()
      const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)

      const [{ data: soma }, { data: meses }] = await Promise.all([
        supabase
          .from('registros_atividade')
          .select('qtd_idosos, qtd_pcd, qtd_colaboradores'),
        supabase
          .from('registros_atividade')
          .select('data_referencia, qtd_idosos, qtd_pcd, qtd_colaboradores')
          .gte('data_referencia', seisMesesAtras.toISOString().split('T')[0])
          .order('data_referencia'),
      ])

      if (soma) {
        const totalAtendimentos = soma.reduce((acc, r) => acc + r.qtd_idosos + r.qtd_pcd + r.qtd_colaboradores, 0)
        setIndicadores({
          total_idosos: soma.reduce((acc, r) => acc + r.qtd_idosos, 0),
          total_pcd: soma.reduce((acc, r) => acc + r.qtd_pcd, 0),
          total_colaboradores: soma.reduce((acc, r) => acc + r.qtd_colaboradores, 0),
          total_atendimentos: totalAtendimentos,
          total_registros: soma.length,
        })
      }

      if (meses) {
        const agrupado: Record<string, number> = {}
        meses.forEach((r) => {
          const data = new Date(r.data_referencia)
          const key = `${data.getFullYear()}-${data.getMonth() + 1}`
          agrupado[key] = (agrupado[key] || 0) + r.qtd_idosos + r.qtd_pcd + r.qtd_colaboradores
        })
        setHistorico(
          Object.entries(agrupado).map(([key, total]) => {
            const [ano, mes] = key.split('-').map(Number)
            return { mes, ano, total }
          })
        )
      }

      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) return <Loading />

  const cards = [
    {
      label: 'Idosos Atendidos',
      value: indicadores?.total_idosos ?? 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'PCD Atendidos',
      value: indicadores?.total_pcd ?? 0,
      icon: Accessibility,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Colaboradores',
      value: indicadores?.total_colaboradores ?? 0,
      icon: Briefcase,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      label: 'Total de Atendimentos',
      value: indicadores?.total_atendimentos ?? 0,
      icon: Activity,
      color: 'text-primary bg-primary-100',
    },
  ]

  const maxTotal = Math.max(...historico.map((h) => h.total), 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel de Indicadores</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral dos atendimentos</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`rounded-lg p-3 ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Atendimentos nos Últimos 6 Meses</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum registro encontrado.</p>
        ) : (
          <div className="flex items-end gap-4 h-48">
            {historico.map((item) => (
              <div key={`${item.ano}-${item.mes}`} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{item.total}</span>
                <div
                  className="w-full rounded-t-lg bg-primary transition-all hover:bg-primary-600"
                  style={{ height: `${(item.total / maxTotal) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-xs text-gray-500 text-center">
                  {formatarMesAno(item.mes, item.ano)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
