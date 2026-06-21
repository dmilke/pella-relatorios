import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { Save, Plus, Trash2, Clock, Lock, Pencil } from 'lucide-react'
import { format, getMonth, getYear } from 'date-fns'

interface RegistroForm {
  id?: string
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
  id: undefined,
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
  const [profissionalFiltroId, setProfissionalFiltroId] = useState('')
  const [periodoInfo, setPeriodoInfo] = useState<{ bloqueado: boolean; prazo: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [existingRecords, setExistingRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 20

  const mes = getMonth(new Date()) + 1
  const ano = getYear(new Date())
  const canChooseProfissional = isAdminOrApoio()

  function getNomeAtividade(id: string) {
    return atividades.find((a) => a.id === id)?.nome ?? id
  }

  function getNomeUnidade(id: string | null) {
    if (!id) return '—'
    return unidades.find((u) => u.id === id)?.nome ?? id
  }

  function getNomeProfissional(id: string) {
    return profissionais.find((p) => p.id === id)?.nome_completo ?? id
  }

  async function carregarRegistrosDoMes(fallback: any[] = [], profissionalIdOverride?: string) {
    if (!user) return

    const inicioMes = format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd')
    const inicioProximoMes = format(new Date(ano, mes, 1), 'yyyy-MM-dd')

    let query = supabase
      .from('registros_atividade')
      .select('*')
      .gte('data_referencia', inicioMes)
      .lt('data_referencia', inicioProximoMes)

    const filtroProfissionalId = profissionalIdOverride ?? profissionalFiltroId

    if (canChooseProfissional) {
      if (filtroProfissionalId) {
        query = query.eq('profissional_id', filtroProfissionalId)
      }
    } else {
      query = query.eq('profissional_id', user.id)
    }

    const { data } = await query.order('data_referencia', { ascending: false })

    if (data && data.length > 0) {
      setExistingRecords(data)
      setPage(1)
      return
    }

    setExistingRecords(fallback)
    setPage(1)
  }

  function editarRegistro(r: any) {
    setRegistros([
      {
        id: r.id,
        profissional_id: r.profissional_id,
        atividade_id: r.atividade_id,
        subatividade_id: r.subatividade_id ?? '',
        data_referencia: r.data_referencia,
        unidade_id: r.unidade_id ?? '',
        qtd_idosos: r.qtd_idosos,
        qtd_pcd: r.qtd_pcd,
        qtd_colaboradores: r.qtd_colaboradores,
      },
    ])
  }

  async function excluirRegistro(id: string) {
    const ok = window.confirm('Excluir este registro?')
    if (!ok) return

    const { error: err } = await supabase.from('registros_atividade').delete().eq('id', id)
    if (err) {
      setError(err.message)
      return
    }

    setExistingRecords((prev) => prev.filter((registro) => registro.id !== id))
  }

  useEffect(() => {
    async function load() {
      const ativQuery = isAdminOrApoio()
        ? supabase.from('atividades').select('id, nome').eq('ativa', true).order('nome')
        : supabase
            .from('autorizacoes_atividade')
            .select('atividade_id, atividades!inner(id, nome)')
            .eq('usuario_id', user?.id)
            .order('atividades(nome)')

      const [profRes, ativRes, unidRes, bloqueioRes] = await Promise.all([
        supabase.from('usuarios').select('id, nome_completo').eq('ativo', true).eq('tem_login', true).order('nome_completo'),
        ativQuery,
        supabase.from('unidades').select('id, nome').eq('ativa', true).order('nome'),
        supabase.rpc('periodo_bloqueado', { p_usuario_id: user?.id, p_mes: mes, p_ano: ano }),
      ])

      const selectedProfissionalId = canChooseProfissional
        ? profRes.data?.some((p) => p.id === profissionalFiltroId)
          ? profissionalFiltroId
          : profRes.data?.[0]?.id ?? ''
        : user?.id ?? ''

      if (profRes.data) setProfissionais(profRes.data)
      if (canChooseProfissional) {
        if (selectedProfissionalId && selectedProfissionalId !== profissionalFiltroId) {
          setProfissionalFiltroId(selectedProfissionalId)
        }

        if (!selectedProfissionalId) {
          setExistingRecords([])
          setLoading(false)
          return
        }
      }
      if (ativRes.data) {
        const ativs = isAdminOrApoio()
          ? ativRes.data.map((a) => ({ ...a, subatividades: [] }))
          : (() => {
              const seen = new Set<string>()
              return ativRes.data
                .map((a: any) => a.atividades)
                .filter((a: { id: string; nome: string }) => {
                  if (seen.has(a.id)) return false
                  seen.add(a.id)
                  return true
                })
                .map((a: any) => ({ ...a, subatividades: [] }))
            })()
        setAtividades(ativs)
      }
      if (unidRes.data) setUnidades(unidRes.data)
      setPeriodoInfo({
        bloqueado: bloqueioRes.data ?? false,
        prazo: `5º dia útil de ${format(new Date(ano, mes), 'MMMM/yyyy')}`,
      })

      await carregarRegistrosDoMes([], selectedProfissionalId)

      setLoading(false)
    }
    load()
  }, [user?.id, user?.perfil, profissionalFiltroId])

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
        profissional_id: canChooseProfissional ? profissionalFiltroId : user?.id ?? '',
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

    const profissionalAutenticado = user?.id ?? ''

    const payloadBase = (r: RegistroForm) => ({
      profissional_id: isAdminOrApoio() ? r.profissional_id : profissionalAutenticado,
      operador_id: user!.id,
      atividade_id: r.atividade_id,
      subatividade_id: r.subatividade_id || null,
      data_referencia: r.data_referencia,
      unidade_id: r.unidade_id || null,
      qtd_idosos: r.qtd_idosos,
      qtd_pcd: r.qtd_pcd,
      qtd_colaboradores: r.qtd_colaboradores,
    })

    const updates = registros.filter((r) => r.id)
    const inserts = registros.filter((r) => !r.id)

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('registros_atividade').insert(inserts.map(payloadBase))
      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
    }

    for (const registro of updates) {
      const { error: updateError } = await supabase
        .from('registros_atividade')
        .update(payloadBase(registro))
        .eq('id', registro.id as string)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    }

    setRegistros([])
    setSuccess('Registro salvo com sucesso.')
    await carregarRegistrosDoMes()

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
        {canChooseProfissional && (
          <div className="w-72">
            <Select
              label="Profissional"
              value={profissionalFiltroId}
              onChange={(e) => setProfissionalFiltroId(e.target.value)}
              options={profissionais.map((p) => ({ value: p.id, label: p.nome_completo }))}
              placeholder="Selecione..."
            />
          </div>
        )}
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
                    {canChooseProfissional && (
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
                      {canChooseProfissional && (
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
              <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
                      {canChooseProfissional && (
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Profissional</th>
                      )}
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Atividade</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Unidade</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Idosos</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">PCD</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Colab.</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Total Atendimentos</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingRecords.slice((page - 1) * perPage, page * perPage).map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{r.data_referencia}</td>
                        <td className="px-4 py-3 text-gray-600">{getNomeAtividade(r.atividade_id)}</td>
                        <td className="px-4 py-3 text-gray-600">{getNomeUnidade(r.unidade_id)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{r.qtd_idosos}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{r.qtd_pcd}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{r.qtd_colaboradores}</td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {Number(r.qtd_idosos) + Number(r.qtd_pcd) + Number(r.qtd_colaboradores)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => editarRegistro(r)}
                              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => excluirRegistro(r.id)}
                              className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {existingRecords.length > perPage && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
                  <span className="text-gray-500">
                    Página {page} de {Math.max(1, Math.ceil(existingRecords.length / perPage))}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      disabled={page >= Math.max(1, Math.ceil(existingRecords.length / perPage))}
                      onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(existingRecords.length / perPage)), p + 1))}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
