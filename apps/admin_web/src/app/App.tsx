import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
const LazyImportPartiesPage = React.lazy(() => import('../features/import/ImportPartiesPage').then(m => ({ default: m.ImportPartiesPage })));
const LazyImportProductsPage = React.lazy(() => import('../features/import/ImportProductsPage').then(m => ({ default: m.ImportProductsPage })));
const LazyOtherIncomePage = React.lazy(() => import('../features/otherIncome/OtherIncomePage').then(m => ({ default: m.OtherIncomePage })));
const LazyStaffDashboardPage = React.lazy(() => import('../features/staff/StaffDashboardPage').then(m => ({ default: m.StaffDashboardPage })));
const LazyDeliveryOrdersPage = React.lazy(() => import('../features/deliveryOrders/DeliveryOrdersPage').then(m => ({ default: m.DeliveryOrdersPage })));
const LazySocialPostPage = React.lazy(() => import('../features/social/SocialPostPage').then(m => ({ default: m.SocialPostPage })));

function SuspenseFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-warm-muted text-sm animate-pulse">
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
                  <Route path="pos" element={<LazyRoute><LazyQuickPosPage /></LazyRoute>} />
                  <Route index element={<DashboardPage />} />
                  <Route path="delivery-orders" element={<LazyRoute><LazyDeliveryOrdersPage /></LazyRoute>} />
                  <Route path="products" element={<Navigate to="/inventory" replace />} />
                  <Route path="sales" element={<LazyRoute><LazySalesHistoryPage /></LazyRoute>} />
                  <Route path="competitor-prices" element={<LazyRoute><LazyCompetitorPricesPage /></LazyRoute>} />
                  <Route path="inventory" element={<LazyRoute><LazyInventoryListPage /></LazyRoute>} />
                  <Route path="inventory/history" element={<LazyRoute><LazyStockHistoryPage /></LazyRoute>} />
                  <Route path="finance/suppliers" element={<LazyRoute><LazySupplierLedgerPage /></LazyRoute>} />
                  <Route path="finance/customers" element={<LazyRoute><LazyCustomerLedgerPage /></LazyRoute>} />
                  <Route path="collections" element={<LazyRoute><LazyCollectionsWorkspace /></LazyRoute>} />
                  <Route path="purchase" element={<LazyRoute><LazyPurchaseEntryPage /></LazyRoute>} />
                  <Route path="purchase/history" element={<LazyRoute><LazyPurchaseHistoryPage /></LazyRoute>} />
                  <Route path="expenses" element={<LazyRoute><LazyExpensesPage /></LazyRoute>} />
                  <Route path="daily-sales" element={<LazyRoute><LazyDailySalesPage /></LazyRoute>} />
                  <Route path="settings" element={<LazyRoute><LazySettingsPage /></LazyRoute>} />
                  <Route path="reports" element={<LazyRoute><LazyReportsPage /></LazyRoute>} />
                  <Route path="reminders" element={<LazyRoute><LazyRemindersPage /></LazyRoute>} />
                  <Route path="import/parties" element={<LazyRoute><LazyImportPartiesPage /></LazyRoute>} />
                  <Route path="import/products" element={<LazyRoute><LazyImportProductsPage /></LazyRoute>} />
                  <Route path="other-income" element={<LazyRoute><LazyOtherIncomePage /></LazyRoute>} />
                  <Route path="staff" element={<LazyRoute><LazyStaffDashboardPage /></LazyRoute>} />
                  <Route path="social-post" element={<LazyRoute><LazySocialPostPage /></LazyRoute>} />
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