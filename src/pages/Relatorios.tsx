import { FileText } from 'lucide-react'

export function Relatorios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Exporte relatórios em PDF e Excel</p>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-12 text-center">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">Módulo em desenvolvimento</h2>
        <p className="text-sm text-gray-500">
          A funcionalidade de exportação de relatórios estará disponível em breve.
        </p>
      </div>
    </div>
  )
}
