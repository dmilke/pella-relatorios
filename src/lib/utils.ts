import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? parseISO(data) : data
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatarMesAno(mes: number, ano: number): string {
  const data = new Date(ano, mes - 1)
  return format(data, "MMMM 'de' yyyy", { locale: ptBR })
}

export const UNIDADES = [
  'Lar Emaús',
  'Lar Listra',
  'Lar Maria Haetinger',
  'Lar Nazaré',
  'Lar Samaria',
  'Lar Samuel | Rute',
  'Lar Tabita',
  'Centro de Cuidados',
  'Centro de Convivência',
  'APAE',
  'Refeitório',
] as const

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
