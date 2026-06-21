import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { RotaAdmin } from '@/components/RotaAdmin'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Lancamento } from '@/pages/lancamento'
import { Admin } from '@/pages/admin'
import { Relatorios } from '@/pages/Relatorios'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancamento" element={<Lancamento />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route
              path="/admin"
              element={
                <RotaAdmin>
                  <Admin />
                </RotaAdmin>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
