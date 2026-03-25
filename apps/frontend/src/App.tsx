import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './hooks/useAuth'
import { StoreProvider } from './hooks/useStore'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Items } from './pages/Items'
import { POS } from './pages/POS'
import { POSCheckoutStatus } from './pages/POSCheckoutStatus'
import { Stores } from './pages/Stores'
import { Unauthorized } from './pages/Unauthorized'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/register"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Register />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/items"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Items />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stores"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Stores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                  <POS />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/checkout/success"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                  <POSCheckoutStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/checkout/fail"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                  <POSCheckoutStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/checkout/cancelled"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                  <POSCheckoutStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/checkout/error"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                  <POSCheckoutStatus />
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Analytics />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  )
}

export default App
