import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Loading } from '@/components/ui/Loading'
import { Save } from 'lucide-react'
import { getMonth, getYear } from 'date-fns'

interface DescritivoForm {
  atividade_id: string
  frequencia: string
  objetivos: string
  relato: string
  acontecimento: string
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
  const [descForm, setDescForm] = useState<DescritivoForm>({
    atividade_id: '',
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

  useEffect(() => {
    async function load() {
      let query = supabase.from('autorizacoes_atividade').select('atividade_id, atividades!inner(id, nome)')

      if (user && !isAdminOrApoio()) {
        query = query.eq('usuario_id', user.id)
      }

      const { data: autorizacoes } = await query.order('atividades(nome)')

      if (autorizacoes) {
        const seen = new Set<string>()
        const ativs = autorizacoes
          .map((a: any) => a.atividades)
          .filter((a: { id: string; nome: string }) => {
            if (seen.has(a.id)) return false
            seen.add(a.id)
            return true
          })
        setAtividades(ativs)
      }

      const { data: profs } = await supabase
        .from('usuarios')
        .select('id, nome_completo')
        .eq('ativo', true)
        .eq('tem_login', true)
        .order('nome_completo')
      if (profs) setProfissionais(profs)

      setLoading(false)
    }
    load()
  }, [])

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
          setDescForm({
            atividade_id: data.atividade_id,
            frequencia: data.frequencia ?? '',
            objetivos: data.objetivos ?? '',
            relato: data.relato ?? '',
            acontecimento: data.acontecimento ?? '',
          })
        } else {
          setDescForm((prev) => ({
            ...prev,
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
      frequencia: descForm.frequencia || null,
      objetivos: descForm.objetivos || null,
      relato: descForm.relato || null,
      acontecimento: descForm.acontecimento || null,
    }

    const { data: existing } = await supabase
      .from('descritivos_mensais')
      .select('id')
      .eq('profissional_id', profId)
      .eq('atividade_id', descForm.atividade_id)
      .eq('mes', Number(mes))
      .eq('ano', Number(ano))
      .maybeSingle()

    let err
    if (existing) {
      ;({ error: err } = await supabase.from('descritivos_mensais').update(payload).eq('id', existing.id))
    } else {
      ;({ error: err } = await supabase.from('descritivos_mensais').insert(payload))
    }

    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
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
          {isAdminOrApoio() && (
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
                Frequência Semanal da Atividade e Grupos Atendidos
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
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
      </div>
    </div>
  )
}
