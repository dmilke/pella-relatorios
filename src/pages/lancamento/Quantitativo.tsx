import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { Save, Plus, Trash2, Clock, Lock } from 'lucide-react'
import { format, getMonth, getYear } from 'date-fns'

interface RegistroForm {
  profissional_id: string
  atividade_id: string
  subatividade_id: string
  data_referencia: string
  unidade_id: string
  qtd_idosos: number
  qtd_pcd: number
  qtd_colaboradores: number
}

interface ProfissionalOption {
  id: string
  nome_completo: string
}

interface AtividadeOption {
  id: string
  nome: string
  subatividades: { id: string; nome: string }[]
}

interface UnidadeOption {
  id: string
  nome: string
}

const emptyRegistro: RegistroForm = {
  profissional_id: '',
  atividade_id: '',
  subatividade_id: '',
  data_referencia: format(new Date(), 'yyyy-MM-dd'),
  unidade_id: '',
  qtd_idosos: 0,
  qtd_pcd: 0,
  qtd_colaboradores: 0,
}

export function Quantitativo() {
  const { user } = useAuth()
  const { isAdminOrApoio } = usePermission()
  const [registros, setRegistros] = useState<RegistroForm[]>([])
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([])
  const [atividades, setAtividades] = useState<AtividadeOption[]>([])
  const [unidades, setUnidades] = useState<UnidadeOption[]>([])
  const [periodoInfo, setPeriodoInfo] = useState<{ bloqueado: boolean; prazo: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [existingRecords, setExistingRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const mes = getMonth(new Date()) + 1
  const ano = getYear(new Date())

  async function carregarRegistrosDoMes() {
    if (!user) return

    const inicioMes = format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd')
    const inicioProximoMes = format(new Date(ano, mes, 1), 'yyyy-MM-dd')

    let query = supabase
      .from('registros_atividade')
      .select('*')
      .gte('data_referencia', inicioMes)
      .lt('data_referencia', inicioProximoMes)

    if (!isAdminOrApoio()) {
      query = query.eq('profissional_id', user.id)
    }

    const { data } = await query.order('data_referencia', { ascending: false })

    setExistingRecords(data ?? [])
  }

  function getNomeAtividade(id: string) {
    return atividades.find((a) => a.id === id)?.nome ?? id
  }

  function getNomeUnidade(id: string | null) {
    if (!id) return '—'
    return unidades.find((u) => u.id === id)?.nome ?? id
  }

  useEffect(() => {
    async function load() {
      const [profRes, ativRes, unidRes, bloqueioRes] = await Promise.all([
        supabase.from('usuarios').select('id, nome_completo').eq('ativo', true).eq('tem_login', true).order('nome_completo'),
        supabase.from('atividades').select('id, nome').eq('ativa', true).order('nome'),
        supabase.from('unidades').select('id, nome').eq('ativa', true).order('nome'),
        supabase.rpc('periodo_bloqueado', { p_usuario_id: user?.id, p_mes: mes, p_ano: ano }),
      ])

      if (profRes.data) setProfissionais(profRes.data)
      if (ativRes.data) {
        const ativs = ativRes.data.map((a) => ({ ...a, subatividades: [] }))
        setAtividades(ativs)
      }
      if (unidRes.data) setUnidades(unidRes.data)
      setPeriodoInfo({
        bloqueado: bloqueioRes.data ?? false,
        prazo: `5º dia útil de ${format(new Date(ano, mes), 'MMMM/yyyy')}`,
      })

      // Se for profissional (não admin/apoio), carregar registros existentes
      await carregarRegistrosDoMes()

      setLoading(false)
    }
    load()
  }, [])

  // Carregar subatividades quando atividade mudar
  const handleAtividadeChange = useCallback(async (index: number, atividadeId: string) => {
    setRegistros((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], atividade_id: atividadeId, subatividade_id: '' }
      return updated
    })

    const { data } = await supabase
      .from('subatividades')
      .select('id, nome')
      .eq('atividade_id', atividadeId)
      .eq('ativa', true)
      .order('nome')

    setAtividades((prev) =>
      prev.map((a) =>
        a.id === atividadeId ? { ...a, subatividades: data ?? [] } : a
      )
    )
  }, [])

  function addLinha() {
    setRegistros((prev) => [
      ...prev,
      {
        ...emptyRegistro,
        profissional_id: user?.perfil === 'profissional' && !isAdminOrApoio() ? user.id : '',
      },
    ])
  }

  function removeLinha(index: number) {
    setRegistros((prev) => prev.filter((_, i) => i !== index))
  }

  function updateLinha(index: number, field: keyof RegistroForm, value: any) {
    setRegistros((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  async function salvar() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    const registrosParaSalvar = registros.map((r) => ({
      profissional_id: r.profissional_id,
      operador_id: user!.id,
      atividade_id: r.atividade_id,
      subatividade_id: r.subatividade_id || null,
      data_referencia: r.data_referencia,
      unidade_id: r.unidade_id || null,
      qtd_idosos: r.qtd_idosos,
      qtd_pcd: r.qtd_pcd,
      qtd_colaboradores: r.qtd_colaboradores,
    }))

    const { error: err } = await supabase.from('registros_atividade').insert(registrosParaSalvar)

    if (err) {
      setError(err.message)
    } else {
      setRegistros([])
      setSuccess('Registro salvo com sucesso.')
      await carregarRegistrosDoMes()
    }

    setSaving(false)
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamento — Quantitativo</h1>
          <p className="text-sm text-gray-500 mt-1">Registre os atendimentos realizados</p>
        </div>
        <div className="flex items-center gap-4">
          {periodoInfo?.bloqueado ? (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <Lock className="h-4 w-4" /> Período bloqueado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" /> Prazo: {periodoInfo?.prazo}
            </span>
          )}
        </div>
      </div>

      {periodoInfo?.bloqueado && !isAdminOrApoio() ? (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-6 text-center">
          <Lock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-yellow-800 font-medium">Período bloqueado</p>
          <p className="text-yellow-600 text-sm">Entre em contato com o Admin para liberação.</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {(isAdminOrApoio() || user?.perfil === 'admin') && (
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Profissional</th>
                    )}
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Atividade</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Subatividade</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Unidade</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Idosos</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">PCD</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Colab.</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      {(isAdminOrApoio() || user?.perfil === 'admin') && (
                        <td className="px-4 py-2">
                          <Select
                            value={r.profissional_id}
                            onChange={(e) => updateLinha(i, 'profissional_id', e.target.value)}
                            options={profissionais.map((p) => ({ value: p.id, label: p.nome_completo }))}
                            placeholder="Selecione..."
                          />
                        </td>
                      )}
                      <td className="px-4 py-2">
                        <Select
                          value={r.atividade_id}
                          onChange={(e) => handleAtividadeChange(i, e.target.value)}
                          options={atividades.map((a) => ({ value: a.id, label: a.nome }))}
                          placeholder="Selecione..."
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          value={r.subatividade_id}
                          onChange={(e) => updateLinha(i, 'subatividade_id', e.target.value)}
                          options={
                            atividades
                              .find((a) => a.id === r.atividade_id)
                              ?.subatividades.map((s) => ({ value: s.id, label: s.nome })) ?? []
                          }
                          placeholder="(opcional)"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="date"
                          value={r.data_referencia}
                          onChange={(e) => updateLinha(i, 'data_referencia', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          value={r.unidade_id}
                          onChange={(e) => updateLinha(i, 'unidade_id', e.target.value)}
                          options={unidades.map((u) => ({ value: u.id, label: u.nome }))}
                          placeholder="(opcional)"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={r.qtd_idosos}
                          onChange={(e) => updateLinha(i, 'qtd_idosos', Number(e.target.value))}
                          className="text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={r.qtd_pcd}
                          onChange={(e) => updateLinha(i, 'qtd_pcd', Number(e.target.value))}
                          className="text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={r.qtd_colaboradores}
                          onChange={(e) => updateLinha(i, 'qtd_colaboradores', Number(e.target.value))}
                          className="text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeLinha(i)}
                          className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <Button variant="outline" onClick={addLinha}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar linha
              </Button>
              <Button onClick={salvar} loading={saving} disabled={registros.length === 0}>
                <Save className="mr-2 h-4 w-4" /> Salvar registros
              </Button>
            </div>
          </div>

          <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Registros do mês</h2>
              <span className="text-xs text-gray-500">{existingRecords.length} registro(s)</span>
            </div>
            {existingRecords.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">
                Nenhum registro lançado neste mês.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Atividade</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Unidade</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Idosos</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">PCD</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Colab.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingRecords.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{r.data_referencia}</td>
                        <td className="px-4 py-3 text-gray-600">{getNomeAtividade(r.atividade_id)}</td>
                        <td className="px-4 py-3 text-gray-600">{getNomeUnidade(r.unidade_id)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{r.qtd_idosos}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{r.qtd_pcd}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{r.qtd_colaboradores}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
