import { type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAuth } from '@/auth/useAuth'
import { Toaster } from '@/components/ui/sonner'
import { AdminPage } from '@/pages/AdminPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { ProductPage } from '@/pages/ProductPage'
import { PublishPage } from '@/pages/PublishPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { MyListingsPage } from '@/pages/MyListingsPage'

function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-background" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/publish"
          element={
            <AuthGate>
              <PublishPage />
            </AuthGate>
          }
        />

        <Route
          path="/me"
          element={
            <AuthGate>
              <MyListingsPage />
            </AuthGate>
          }
        />

        <Route
          path="/admin"
          element={
            <AuthGate>
              <AdminPage />
            </AuthGate>
          }
        />

        <Route path="/products/:id" element={<ProductPage />} />
      </Routes>

      <Toaster />
    </>
  )
}

export default App
