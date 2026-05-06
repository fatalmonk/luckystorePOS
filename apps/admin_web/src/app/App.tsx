import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { Layout } from '../components/Layout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AuthGuard } from './AuthGuard';
import { ErrorBoundary } from './ErrorBoundary';
import { OAuthConsentPage } from '../features/oauth/OAuthConsentPage';
import { NotificationProvider } from '../components/Notification';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { InstallPrompt } from '../components/InstallPrompt';
import { AuthProvider } from '../lib/AuthContext';

const LazyProductListPage = React.lazy(() => import('../features/products/ProductListPage').then(m => ({ default: m.ProductListPage })));
const LazyInventoryListPage = React.lazy(() => import('../features/inventory/InventoryListPage').then(m => ({ default: m.InventoryListPage })));
const LazyStockHistoryPage = React.lazy(() => import('../features/inventory/StockHistoryPage').then(m => ({ default: m.StockHistoryPage })));
const LazySalesHistoryPage = React.lazy(() => import('../features/sales/SalesHistoryPage').then(m => ({ default: m.SalesHistoryPage })));
const LazySupplierLedgerPage = React.lazy(() => import('../features/finance/SupplierLedgerPage').then(m => ({ default: m.SupplierLedgerPage })));
const LazyCustomerLedgerPage = React.lazy(() => import('../features/finance/CustomerLedgerPage').then(m => ({ default: m.CustomerLedgerPage })));
const LazyCollectionsWorkspace = React.lazy(() => import('../features/collections/CollectionsWorkspace').then(m => ({ default: m.CollectionsWorkspace })));
const LazyPurchaseEntryPage = React.lazy(() => import('../features/purchase/PurchaseEntryPage').then(m => ({ default: m.PurchaseEntryPage })));
const LazySettingsPage = React.lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const LazyReportsPage = React.lazy(() => import('../features/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const LazyQuickPosPage = React.lazy(() => import('../features/pos/QuickPosPage').then(m => ({ default: m.QuickPosPage })));
const LazyRemindersPage = React.lazy(() => import('../features/reminders/RemindersPage').then(m => ({ default: m.RemindersPage })));
const LazyExpensesPage = React.lazy(() => import('../features/expenses/ExpensesPage').then(m => ({ default: m.ExpensesPage })));

function SuspenseFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      color: 'var(--text-muted)',
      fontSize: 'var(--font-size-sm)',
    }}>
      Loading...
    </div>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SuspenseFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <QueryProvider>
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <OfflineIndicator />
              <Routes>
                <Route path="/oauth/consent" element={<OAuthConsentPage />} />
                <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="pos" element={<LazyRoute><LazyQuickPosPage /></LazyRoute>} />
                  <Route path="sales" element={<LazyRoute><LazySalesHistoryPage /></LazyRoute>} />
                  <Route path="products" element={<LazyRoute><LazyProductListPage /></LazyRoute>} />
                  <Route path="inventory" element={<LazyRoute><LazyInventoryListPage /></LazyRoute>} />
                  <Route path="inventory/history" element={<LazyRoute><LazyStockHistoryPage /></LazyRoute>} />
                  <Route path="finance/suppliers" element={<LazyRoute><LazySupplierLedgerPage /></LazyRoute>} />
                  <Route path="finance/customers" element={<LazyRoute><LazyCustomerLedgerPage /></LazyRoute>} />
                  <Route path="collections" element={<LazyRoute><LazyCollectionsWorkspace /></LazyRoute>} />
                  <Route path="purchase" element={<LazyRoute><LazyPurchaseEntryPage /></LazyRoute>} />
                  <Route path="expenses" element={<LazyRoute><LazyExpensesPage /></LazyRoute>} />
                  <Route path="settings" element={<LazyRoute><LazySettingsPage /></LazyRoute>} />
                  <Route path="reports" element={<LazyRoute><LazyReportsPage /></LazyRoute>} />
                  <Route path="reminders" element={<LazyRoute><LazyRemindersPage /></LazyRoute>} />
                </Route>
              </Routes>
              <InstallPrompt />
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </QueryProvider>
  );
}

export default App;