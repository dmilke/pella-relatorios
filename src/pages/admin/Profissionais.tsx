import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { Plus, Pencil, X, Check } from 'lucide-react'
import type { PerfilUsuario } from '@/types'

interface UsuarioForm {
  nome_completo: string
  area_profissao: string
  conselho: string
  email: string
  perfil: PerfilUsuario
  tem_login: boolean
  senha: string
}

const emptyForm: UsuarioForm = {
  nome_completo: '',
  area_profissao: '',
  conselho: '',
  email: '',
  perfil: 'profissional',
  tem_login: true,
  senha: '',
}

const perfis: { value: PerfilUsuario; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'apoio', label: 'Apoio' },
  { value: 'analista', label: 'Analista' },
  { value: 'profissional', label: 'Profissional' },
]

export function Profissionais() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<UsuarioForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUsuarios()
  }, [])

  async function loadUsuarios() {
    const { data } = await supabase.from('usuarios').select('*').order('nome_completo')
    if (data) setUsuarios(data)
    setLoading(false)
  }

  function resetForm() {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    setError(null)
  }

  function editUsuario(u: any) {
    setForm({
      nome_completo: u.nome_completo,
      area_profissao: u.area_profissao,
      conselho: u.conselho ?? '',
      email: u.email ?? '',
      perfil: u.perfil,
      tem_login: u.tem_login,
      senha: '',
    })
    setEditId(u.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (editId) {
      const { error: err } = await supabase
        .from('usuarios')
        .update({ nome_completo: form.nome_completo, area_profissao: form.area_profissao, conselho: form.conselho || null, email: form.email || null, perfil: form.perfil })
        .eq('id', editId)

      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }

      if (form.senha) {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redefinir-senha`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              usuario_id: editId,
              nova_senha: form.senha,
            }),
          }
        )

        if (!res.ok) {
          const errData = await res.json()
          setError(errData.error || 'Erro ao redefinir senha')
          setSaving(false)
          return
        }
      }

      await loadUsuarios()
      resetForm()
    } else {
      if (form.tem_login) {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              nome_completo: form.nome_completo,
              area_profissao: form.area_profissao,
              conselho: form.conselho,
              email: form.email,
              perfil_acesso: form.perfil,
              senha: form.senha,
              tem_login: form.tem_login,
            }),
          }
        )

        if (!res.ok) {
          const errData = await res.json()
          setError(errData.error || 'Erro ao criar usuário')
        } else {
          await loadUsuarios()
          resetForm()
        }
      } else {
        const { error: err } = await supabase.from('usuarios').insert({
          nome_completo: form.nome_completo,
          area_profissao: form.area_profissao,
          conselho: form.conselho || null,
          email: null,
          perfil: form.perfil,
          tem_login: false,
        })

        if (err) {
          setError(err.message)
        } else {
          await loadUsuarios()
          resetForm()
        }
      }
    }

    setSaving(false)
  }

  async function toggleAtivo(usuario: any) {
    await supabase.from('usuarios').update({ ativo: !usuario.ativo }).eq('id', usuario.id)
    await loadUsuarios()
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Novo profissional
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl bg-white shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Nome"
              value={form.nome_completo}
              onChange={(e) => setForm((f) => ({ ...f, nome_completo: e.target.value }))}
              required
            />
            <Input
              label="Área/Profissão"
              value={form.area_profissao}
              onChange={(e) => setForm((f) => ({ ...f, area_profissao: e.target.value }))}
              required
            />
            <Input
              label="Conselho (ex: CRM 123456)"
              value={form.conselho}
              onChange={(e) => setForm((f) => ({ ...f, conselho: e.target.value }))}
              placeholder="Opcional"
            />
            <Select
              label="Perfil"
              value={form.perfil}
              onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value as PerfilUsuario }))}
              options={perfis}
            />
            {form.tem_login && (
              <Input
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required={form.tem_login}
              />
            )}
            {form.tem_login && (
              <Input
                label="Senha"
                type="password"
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                required={form.tem_login && !editId}
                placeholder={editId ? 'Deixe em branco para manter' : undefined}
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.tem_login}
                onChange={(e) => setForm((f) => ({ ...f, tem_login: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Possui login
            </label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              {editId ? 'Salvar' : 'Criar'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-700">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Área/Profissão</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Conselho</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Perfil</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">E-mail</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.nome_completo}</td>
                <td className="px-4 py-3 text-gray-600">{u.area_profissao}</td>
                <td className="px-4 py-3 text-gray-600">{u.conselho ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.perfil === 'admin' ? 'info' : 'default'}>
                    {u.perfil}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={u.ativo ? 'success' : 'danger'}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => editUsuario(u)}
                      className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleAtivo(u)}
                      className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                      title={u.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {u.ativo ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
