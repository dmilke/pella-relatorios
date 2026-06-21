export type PerfilUsuario = 'admin' | 'apoio' | 'analista' | 'profissional'

export type CategoriaEncaminhamento =
  | 'Pronto Socorro'
  | 'Outras Especialidades Particular'
  | 'Outras Especialidades SUS'
  | 'Atendimentos dentista/SUS'
  | 'Atendimentos dentista/Part'

export interface Usuario {
  id: string
  nome_completo: string
  area_profissao: string
  conselho: string | null
  email: string | null
  perfil: PerfilUsuario
  tem_login: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Atividade {
  id: string
  nome: string
  ativa: boolean
  criado_em: string
  subatividades?: Subatividade[]
}

export interface Subatividade {
  id: string
  atividade_id: string
  nome: string
  ativa: boolean
  criado_em: string
}

export interface AutorizacaoAtividade {
  id: string
  usuario_id: string
  atividade_id: string
  local_obrigatorio: boolean
  criado_em: string
}

export interface RegistroAtividade {
  id: string
  profissional_id: string
  operador_id: string
  atividade_id: string
  subatividade_id: string | null
  data_referencia: string
  unidade_id: string | null
  lancado_em: string
  qtd_idosos: number
  qtd_pcd: number
  qtd_colaboradores: number
  criado_em: string
  atualizado_em: string
  profissional?: Usuario
  atividade?: Atividade
  subatividade?: Subatividade
}

export interface RegistroEncaminhamento {
  id: string
  operador_id: string
  data_referencia: string
  categoria: CategoriaEncaminhamento
  lancado_em: string
  qtd_idosos: number
  qtd_pcd: number
  criado_em: string
  atualizado_em: string
}

export interface DescritivoMensal {
  id: string
  profissional_id: string
  atividade_id: string
  mes: number
  ano: number
  frequencia: string | null
  objetivos: string | null
  relato: string | null
  acontecimento: string | null
  criado_em: string
  atualizado_em: string
  atividade?: Atividade
}

export interface Periodo {
  id: string
  usuario_id: string
  ano: number
  mes: number
  status: 'aberto' | 'bloqueado' | 'liberado'
  prazo_limite: string
  liberado_por: string | null
  liberado_em: string | null
  criado_em: string
}

export interface Unidade {
  id: string
  nome: string
  ativa: boolean
  criado_em: string
}

export interface Notificacao {
  id: string
  destinatario_id: string
  mensagem: string
  lida: boolean
  criado_em: string
}

export interface Auditoria {
  id: string
  operador_id: string
  tabela: string
  registro_id: string
  acao: string
  dados_antes: Record<string, unknown> | null
  dados_depois: Record<string, unknown> | null
  criado_em: string
}
