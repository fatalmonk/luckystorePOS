import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AdminLayout } from '../layouts/AdminLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { ErrorBoundary } from './ErrorBoundary';
import { OAuthConsentPage } from '../features/oauth/OAuthConsentPage';
import { LoginPage } from '../features/auth/LoginPage';
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
const LazyPurchaseHistoryPage = React.lazy(() => import('../features/purchase/PurchaseHistoryPage').then(m => ({ default: m.PurchaseHistoryPage })));
const LazySettingsPage = React.lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const LazyReportsPage = React.lazy(() => import('../features/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const LazyQuickPosPage = React.lazy(() => import('../features/pos/QuickPosPage').then(m => ({ default: m.QuickPosPage })));
const LazyRemindersPage = React.lazy(() => import('../features/reminders/RemindersPage').then(m => ({ default: m.RemindersPage })));
const LazyExpensesPage = React.lazy(() => import('../features/expenses/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const LazyDailySalesPage = React.lazy(() => import('../features/sales/DailySalesPage').then(m => ({ default: m.DailySalesPage })));
const LazyCompetitorPricesPage = React.lazy(() => import('../features/competitorPrices/CompetitorPricesPage').then(m => ({ default: m.CompetitorPricesPage })));

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

const router = createBrowserRouter([
  {
    path: '/oauth/consent',
    element: <OAuthConsentPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout>
          <Outlet />
        </AdminLayout>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'pos',
        element: <LazyRoute><LazyQuickPosPage /></LazyRoute>,
      },
      {
        path: 'sales',
        element: <LazyRoute><LazySalesHistoryPage /></LazyRoute>,
      },
      {
        path: 'products',
        element: <LazyRoute><LazyProductListPage /></LazyRoute>,
      },
      {
        path: 'inventory',
        element: <LazyRoute><LazyInventoryListPage /></LazyRoute>,
      },
      {
        path: 'inventory/history',
        element: <LazyRoute><LazyStockHistoryPage /></LazyRoute>,
      },
      {
        path: 'finance/suppliers',
        element: <LazyRoute><LazySupplierLedgerPage /></LazyRoute>,
      },
      {
        path: 'finance/customers',
        element: <LazyRoute><LazyCustomerLedgerPage /></LazyRoute>,
      },
      {
        path: 'collections',
        element: <LazyRoute><LazyCollectionsWorkspace /></LazyRoute>,
      },
      {
        path: 'purchase',
        element: <LazyRoute><LazyPurchaseEntryPage /></LazyRoute>,
      },
      {
        path: 'purchase/history',
        element: <LazyRoute><LazyPurchaseHistoryPage /></LazyRoute>,
      },
      {
        path: 'expenses',
        element: <LazyRoute><LazyExpensesPage /></LazyRoute>,
      },
      {
        path: 'settings',
        element: <LazyRoute><LazySettingsPage /></LazyRoute>,
      },
      {
        path: 'reports',
        element: <LazyRoute><LazyReportsPage /></LazyRoute>,
      },
      {
        path: 'reminders',
        element: <LazyRoute><LazyRemindersPage /></LazyRoute>,
      },
    ],
  },
], {
  basename: '/admin'
});

export function App() {
  return (
    <QueryProvider>
      <NotificationProvider>
        <AuthProvider>
          <ErrorBoundary>
            <OfflineIndicator />
            <RouterProvider router={router} />
            <InstallPrompt />
          </ErrorBoundary>
        </AuthProvider>
      </NotificationProvider>
    </QueryProvider>
  );
}

export default App;