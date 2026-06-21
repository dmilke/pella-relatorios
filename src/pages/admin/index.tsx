import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Profissionais } from './Profissionais'
import { Catalogo } from './Catalogo'
import { Periodos } from './Periodos'

type Aba = 'profissionais' | 'catalogo' | 'periodos'

const abas: { key: Aba; label: string }[] = [
  { key: 'profissionais', label: 'Profissionais' },
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'periodos', label: 'Períodos' },
]

export function Admin() {
  const [aba, setAba] = useState<Aba>('profissionais')

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {abas.map((a) => (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                aba === a.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {a.label}
            </button>
          ))}
        </nav>
      </div>

      {aba === 'profissionais' && <Profissionais />}
      {aba === 'catalogo' && <Catalogo />}
      {aba === 'periodos' && <Periodos />}
    </div>
  )
}
