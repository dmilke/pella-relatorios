import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { Plus, Pencil, X, Check, ChevronDown, ChevronRight } from 'lucide-react'

export function Catalogo() {
  const [atividades, setAtividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newAtividade, setNewAtividade] = useState('')
  const [addingAtividade, setAddingAtividade] = useState(false)
  const [expandido, setExpandido] = useState<Set<string>>(new Set())
  const [subForms, setSubForms] = useState<Record<string, string>>({})

  useEffect(() => {
    loadAtividades()
  }, [])

  async function loadAtividades() {
    const { data } = await supabase.from('atividades').select('*').order('nome')
    if (data) setAtividades(data)
    setLoading(false)
  }

  async function addAtividade() {
    if (!newAtividade.trim()) return
    await supabase.from('atividades').insert({ nome: newAtividade.trim() })
    setNewAtividade('')
    setAddingAtividade(false)
    await loadAtividades()
  }

  async function toggleAtiva(atividade: any) {
    await supabase.from('atividades').update({ ativa: !atividade.ativa }).eq('id', atividade.id)
    await loadAtividades()
  }

  async function loadSubatividades(atividadeId: string) {
    const { data } = await supabase
      .from('subatividades')
      .select('*')
      .eq('atividade_id', atividadeId)
      .order('nome')

    setAtividades((prev) =>
      prev.map((a) => (a.id === atividadeId ? { ...a, subatividades: data ?? [] } : a))
    )
  }

  function toggleExpand(atividadeId: string) {
    setExpandido((prev) => {
      const next = new Set(prev)
      if (next.has(atividadeId)) {
        next.delete(atividadeId)
      } else {
        next.add(atividadeId)
        loadSubatividades(atividadeId)
      }
      return next
    })
  }

  async function addSubatividade(atividadeId: string) {
    const nome = subForms[atividadeId]?.trim()
    if (!nome) return

    await supabase.from('subatividades').insert({ atividade_id: atividadeId, nome })
    setSubForms((prev) => ({ ...prev, [atividadeId]: '' }))
    await loadSubatividades(atividadeId)
  }

  async function toggleSubAtiva(sub: any) {
    await supabase.from('subatividades').update({ ativa: !sub.ativa }).eq('id', sub.id)
    if (sub.atividade_id) await loadSubatividades(sub.atividade_id)
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Atividades</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie atividades e subatividades</p>
        </div>
        <Button onClick={() => setAddingAtividade(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova atividade
        </Button>
      </div>

      {addingAtividade && (
        <div className="flex gap-2">
          <Input
            value={newAtividade}
            onChange={(e) => setNewAtividade(e.target.value)}
            placeholder="Nome da atividade"
            onKeyDown={(e) => e.key === 'Enter' && addAtividade()}
          />
          <Button onClick={addAtividade}>Adicionar</Button>
          <Button variant="outline" onClick={() => { setAddingAtividade(false); setNewAtividade('') }}>
            Cancelar
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {atividades.map((atividade) => (
          <div key={atividade.id} className="rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleExpand(atividade.id)}
                  className="rounded p-1 hover:bg-gray-100"
                >
                  {expandido.has(atividade.id) ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                <span className="font-medium text-gray-900">{atividade.nome}</span>
                <Badge variant={atividade.ativa ? 'success' : 'danger'}>
                  {atividade.ativa ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <button
                onClick={() => toggleAtiva(atividade)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                title={atividade.ativa ? 'Desativar' : 'Ativar'}
              >
                {atividade.ativa ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
              </button>
            </div>

            {expandido.has(atividade.id) && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                {(atividade.subatividades ?? []).map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between pl-8">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{sub.nome}</span>
                      <Badge variant={sub.ativa ? 'success' : 'danger'}>
                        {sub.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <button
                      onClick={() => toggleSubAtiva(sub)}
                      className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                    >
                      {sub.ativa ? <X className="h-3 w-3 text-red-500" /> : <Check className="h-3 w-3 text-green-500" />}
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pl-8">
                  <Input
                    value={subForms[atividade.id] ?? ''}
                    onChange={(e) => setSubForms((prev) => ({ ...prev, [atividade.id]: e.target.value }))}
                    placeholder="Nova subatividade"
                    className="max-w-xs"
                    onKeyDown={(e) => e.key === 'Enter' && addSubatividade(atividade.id)}
                  />
                  <Button variant="outline" onClick={() => addSubatividade(atividade.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
