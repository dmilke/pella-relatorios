import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Loading } from '@/components/ui/Loading'
import { Save, Pencil, Trash2 } from 'lucide-react'
import { format, getMonth, getYear } from 'date-fns'

interface DescritivoForm {
  atividade_id: string
  atividade_desenvolvida: string
  frequencia: string
  objetivos: string
  relato: string
  acontecimento: string
}

interface DescritivoRegistro extends DescritivoForm {
  id: string
  profissional_id: string
  mes: number
  ano: number
  atualizado_em: string
}

const meses = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

export function Descritivo() {
  const { user } = useAuth()
  const { isAdminOrApoio } = usePermission()
  const [atividades, setAtividades] = useState<{ id: string; nome: string }[]>([])
  const [profissionais, setProfissionais] = useState<{ id: string; nome_completo: string }[]>([])
  const [registrosDoMes, setRegistrosDoMes] = useState<DescritivoRegistro[]>([])
  const [descForm, setDescForm] = useState<DescritivoForm>({
    atividade_id: '',
    atividade_desenvolvida: '',
    frequencia: '',
    objetivos: '',
    relato: '',
    acontecimento: '',
  })
  const [mes, setMes] = useState(String(getMonth(new Date()) + 1))
  const [ano, setAno] = useState(String(getYear(new Date())))
  const [profissionalId, setProfissionalId] = useState(user?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 20
  const canChooseProfissional = isAdminOrApoio()

  function getNomeProfissional(id: string) {
    return profissionais.find((p) => p.id === id)?.nome_completo ?? id
  }

  function getNomeAtividade(id: string) {
    return atividades.find((a) => a.id === id)?.nome ?? id
  }

  function getResumo(texto: string | null) {
    if (!texto) return '—'
    return texto.length > 70 ? `${texto.slice(0, 70)}...` : texto
  }

  async function carregarRegistrosDoMes(profissionalIdOverride?: string) {
    if (!user) return

    const filtroProfissionalId = profissionalIdOverride ?? profissionalId
    if (!filtroProfissionalId) {
      setRegistrosDoMes([])
      return
    }

    let query = supabase
      .from('descritivos_mensais')
      .select('*')
      .eq('profissional_id', filtroProfissionalId)
      .eq('mes', Number(mes))
      .eq('ano', Number(ano))

    const { data } = await query.order('criado_em', { ascending: false })
    setRegistrosDoMes(data ?? [])
    setPage(1)
  }

  useEffect(() => {
    async function load() {
      const { data: ativs } = await supabase.from('atividades').select('id, nome').eq('ativa', true).order('nome')
      if (ativs) setAtividades(ativs)

      const { data: profs } = await supabase
        .from('usuarios')
        .select('id, nome_completo')
        .eq('ativo', true)
        .eq('tem_login', true)
        .order('nome_completo')
      if (profs) setProfissionais(profs)

      const selectedProfissionalId =
        canChooseProfissional && profs?.some((p) => p.id === profissionalId)
          ? profissionalId
          : canChooseProfissional
            ? profs?.[0]?.id ?? ''
            : user?.id ?? ''

      if (canChooseProfissional && selectedProfissionalId && selectedProfissionalId !== profissionalId) {
        setProfissionalId(selectedProfissionalId)
      }

      await carregarRegistrosDoMes(selectedProfissionalId)

      setLoading(false)
    }
    load()
  }, [mes, ano, user?.id, user?.perfil, profissionalId])

  useEffect(() => {
    if (!descForm.atividade_id || !mes || !ano) return

    const profId = isAdminOrApoio() ? profissionalId : user?.id
    if (!profId) return

    supabase
      .from('descritivos_mensais')
      .select('*')
      .eq('profissional_id', profId)
      .eq('atividade_id', descForm.atividade_id)
      .eq('mes', Number(mes))
      .eq('ano', Number(ano))
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEditingId(data.id)
          setDescForm({
            atividade_id: data.atividade_id,
            atividade_desenvolvida: data.atividade_desenvolvida ?? '',
            frequencia: data.frequencia ?? '',
            objetivos: data.objetivos ?? '',
            relato: data.relato ?? '',
            acontecimento: data.acontecimento ?? '',
          })
        } else {
          setEditingId(null)
          setDescForm((prev) => ({
            ...prev,
            atividade_desenvolvida: '',
            frequencia: '',
            objetivos: '',
            relato: '',
            acontecimento: '',
          }))
        }
      })
  }, [descForm.atividade_id, mes, ano, profissionalId])

  async function salvar() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const profId = isAdminOrApoio() ? profissionalId : user?.id
    if (!profId) return

    const payload = {
      profissional_id: profId,
      atividade_id: descForm.atividade_id,
      mes: Number(mes),
      ano: Number(ano),
      atividade_desenvolvida: descForm.atividade_desenvolvida || null,
      frequencia: descForm.frequencia || null,
      objetivos: descForm.objetivos || null,
      relato: descForm.relato || null,
      acontecimento: descForm.acontecimento || null,
    }

    let err
    if (editingId) {
      ;({ error: err } = await supabase.from('descritivos_mensais').update(payload).eq('id', editingId))
    } else {
      ;({ error: err } = await supabase
        .from('descritivos_mensais')
        .upsert(payload, { onConflict: 'profissional_id,atividade_id,mes,ano' }))
    }

    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      setEditingId(null)
      setTimeout(() => setSuccess(false), 3000)
      await carregarRegistrosDoMes()
    }

    setSaving(false)
  }

  function editarRegistro(r: DescritivoRegistro) {
    setEditingId(r.id)
    setProfissionalId(r.profissional_id)
    setDescForm({
      atividade_id: r.atividade_id,
      atividade_desenvolvida: r.atividade_desenvolvida ?? '',
      frequencia: r.frequencia ?? '',
      objetivos: r.objetivos ?? '',
      relato: r.relato ?? '',
      acontecimento: r.acontecimento ?? '',
    })
  }

  async function excluirRegistro(id: string) {
    const ok = window.confirm('Excluir este descritivo?')
    if (!ok) return

    const { error: err } = await supabase.from('descritivos_mensais').delete().eq('id', id)
    if (err) {
      setError(err.message)
      return
    }

    if (editingId === id) {
      setEditingId(null)
      setDescForm({
        atividade_id: '',
        atividade_desenvolvida: '',
        frequencia: '',
        objetivos: '',
        relato: '',
        acontecimento: '',
      })
    }

    setRegistrosDoMes((prev) => prev.filter((registro) => registro.id !== id))
  }

  const totalPages = Math.max(1, Math.ceil(registrosDoMes.length / perPage))
  const pagedRecords = registrosDoMes.slice((page - 1) * perPage, page * perPage)

  function getMesLabel(valor: number) {
    return meses.find((m) => m.value === String(valor))?.label ?? String(valor)
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lançamento — Descritivo</h1>
        <p className="text-sm text-gray-500 mt-1">Registre o descritivo mensal das atividades</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          Descritivo salvo com sucesso!
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {canChooseProfissional && (
              <Select
                label="Profissional"
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
              options={profissionais.map((p) => ({ value: p.id, label: p.nome_completo }))}
              placeholder="Selecione..."
            />
          )}
          <Select
            label="Atividade"
            value={descForm.atividade_id}
            onChange={(e) => setDescForm((prev) => ({ ...prev, atividade_id: e.target.value }))}
            options={atividades.map((a) => ({ value: a.id, label: a.nome }))}
            placeholder="Selecione..."
          />
          <Select
            label="Mês"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            options={meses}
          />
          <Select
            label="Ano"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            options={[
              { value: String(getYear(new Date()) - 1), label: String(getYear(new Date()) - 1) },
              { value: String(getYear(new Date())), label: String(getYear(new Date())) },
              { value: String(getYear(new Date()) + 1), label: String(getYear(new Date()) + 1) },
            ]}
          />
        </div>

        {descForm.atividade_id && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Atividade Desenvolvida
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[72px]"
                value={descForm.atividade_desenvolvida}
                onChange={(e) => setDescForm((prev) => ({ ...prev, atividade_desenvolvida: e.target.value }))}
                placeholder="Descreva a atividade desenvolvida..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequência Semanal da Atividade e Grupos Atendidos
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[72px]"
                value={descForm.frequencia}
                onChange={(e) => setDescForm((prev) => ({ ...prev, frequencia: e.target.value }))}
                placeholder="Descreva a frequência semanal e grupos atendidos..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objetivos das Atividades Desenvolvidas no Mês
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[72px]"
                value={descForm.objetivos}
                onChange={(e) => setDescForm((prev) => ({ ...prev, objetivos: e.target.value }))}
                placeholder="Descreva os objetivos..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relato das Atividades Desenvolvidas
              </label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[88px]"
                value={descForm.relato}
                onChange={(e) => setDescForm((prev) => ({ ...prev, relato: e.target.value }))}
                placeholder="Relate as atividades desenvolvidas (pode ser por semana ou mensal)..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registro de Acontecimento Relevante
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[72px]"
                value={descForm.acontecimento}
                onChange={(e) => setDescForm((prev) => ({ ...prev, acontecimento: e.target.value }))}
                placeholder="Depoimentos, reações, feedback do trabalho..."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={salvar} loading={saving}>
                <Save className="mr-2 h-4 w-4" /> Salvar Descritivo
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Registros do mês</h2>
            <span className="text-xs text-gray-500">{registrosDoMes.length} registro(s)</span>
          </div>
          {registrosDoMes.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">Nenhum descritivo lançado neste mês.</div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Atividade</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Mês</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Ano</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Data da última atualização</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRecords.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{getNomeAtividade(r.atividade_id)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{getMesLabel(r.mes)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.ano}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {format(new Date(r.atualizado_em), 'dd/MM/yyyy HH:mm')}
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
              {registrosDoMes.length > perPage && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
                  <span className="text-gray-500">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Anterior
                    </Button>
                    <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
