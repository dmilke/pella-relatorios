import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { Unlock, Lock } from 'lucide-react'
import { formatarMesAno } from '@/lib/utils'

export function Periodos() {
  const [periodos, setPeriodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterBloqueados, setFilterBloqueados] = useState(true)
  const [profissionais, setProfissionais] = useState<{ id: string; nome_completo: string }[]>([])
  const [filterProf, setFilterProf] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('usuarios').select('id, nome_completo').eq('ativo', true).order('nome_completo'),
    ]).then(([profRes]) => {
      if (profRes.data) setProfissionais(profRes.data)
    })
  }, [])

  useEffect(() => {
    loadPeriodos()
  }, [filterBloqueados, filterProf])

  async function loadPeriodos() {
    let query = supabase
      .from('periodos')
      .select('*, usuarios!inner(nome_completo)')

    if (filterProf) {
      query = query.eq('usuario_id', filterProf)
    }

    const { data: periodosData } = await query.order('ano', { ascending: false }).order('mes', { ascending: false })

    if (!periodosData) {
      setPeriodos([])
      setLoading(false)
      return
    }

    let data = periodosData.map((p: any) => ({
      ...p,
    }))

    if (filterBloqueados) {
      data = data.filter((d) => d.status === 'bloqueado' && d.liberado_em === null)
    }

    setPeriodos(data)
    setLoading(false)
  }

  async function liberar(periodo: any) {
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase
      .from('periodos')
      .update({
        status: 'liberado',
        liberado_por: session?.user.id,
        liberado_em: new Date().toISOString(),
      })
      .eq('id', periodo.id)
    if (!error) await loadPeriodos()
  }

  async function bloquearNovamente(periodo: any) {
    await supabase
      .from('periodos')
      .update({
        status: 'bloqueado',
        liberado_por: null,
        liberado_em: null,
      })
      .eq('id', periodo.id)

    await loadPeriodos()
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Períodos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie bloqueios e liberações de período</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={filterProf}
          onChange={(e) => setFilterProf(e.target.value)}
          options={profissionais.map((p) => ({ value: p.id, label: p.nome_completo }))}
          placeholder="Todos os profissionais"
          className="max-w-xs"
        />
        <Button
          variant={filterBloqueados ? 'primary' : 'outline'}
          onClick={() => setFilterBloqueados(true)}
        >
          Bloqueados
        </Button>
        <Button
          variant={!filterBloqueados ? 'primary' : 'outline'}
          onClick={() => setFilterBloqueados(false)}
        >
          Todos
        </Button>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-700">Profissional</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Período</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {periodos.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.usuarios?.nome_completo ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{formatarMesAno(p.mes, p.ano)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={p.status === 'liberado' ? 'warning' : 'danger'}>
                    {p.status === 'liberado' ? 'Liberado' : 'Bloqueado'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  {p.status === 'liberado' ? (
                    <Button variant="outline" onClick={() => bloquearNovamente(p)}>
                      <Lock className="mr-2 h-4 w-4" /> Bloquear novamente
                    </Button>
                  ) : (
                    <Button onClick={() => liberar(p)}>
                      <Unlock className="mr-2 h-4 w-4" /> Liberar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {periodos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Nenhum período encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
