import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Quantitativo } from './Quantitativo'
import { Descritivo } from './Descritivo'

type Aba = 'quantitativo' | 'descritivo'

const abas: { key: Aba; label: string }[] = [
  { key: 'quantitativo', label: 'Quantitativo' },
  { key: 'descritivo', label: 'Descritivo' },
]

export function Lancamento() {
  const [aba, setAba] = useState<Aba>('quantitativo')

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

      {aba === 'quantitativo' && <Quantitativo />}
      {aba === 'descritivo' && <Descritivo />}
    </div>
  )
}
