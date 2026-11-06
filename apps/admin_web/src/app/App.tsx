import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { Layout } from '@/components';
import { AuthGuard } from './AuthGuard';
import { ErrorBoundary } from './ErrorBoundary';
import { OAuthConsentPage } from '../features/oauth/OAuthConsentPage';
import { NotificationProvider } from '@/components';
import { OfflineIndicator } from '@/components';
import { InstallPrompt } from '@/components';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { ResetPasswordPage } from './ResetPasswordPage';
import { ADMIN_ROUTE_PATHS } from './routePaths';

const LazyCanvaDesignPage = React.lazy(() => import('../features/canva/CanvaDesignPage').then(m => ({ default: m.CanvaDesignPage })));
const LazyCanvaConnectionPage = React.lazy(() => import('../features/canva/CanvaConnectionPage').then(m => ({ default: m.CanvaConnectionPage })));

const LazyDashboardPage = React.lazy(() => import('../features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LazyDashboardV2Page = React.lazy(() => import('../features/dashboard/DashboardV2Page').then(m => ({ default: m.DashboardV2Page })));
const LazyInventoryListPage = React.lazy(() => import('../features/inventory/InventoryListPage').then(m => ({ default: m.InventoryListPage })));
const LazyStockHistoryPage = React.lazy(() => import('../features/inventory/StockHistoryPage').then(m => ({ default: m.StockHistoryPage })));
const LazyMissingImagesPage = React.lazy(() => import('../features/inventory/MissingImagesPage').then(m => ({ default: m.MissingImagesPage })));
const LazyFinanceDashboardPage = React.lazy(() => import('../features/finance/FinanceDashboardPage').then(m => ({ default: m.FinanceDashboardPage })));
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


const LazyCompetitorPricesPage = React.lazy(() => import('../features/competitorPrices/CompetitorPricesPage').then(m => ({ default: m.CompetitorPricesPage })));
const LazyImportPartiesPage = React.lazy(() => import('../features/import/ImportPartiesPage').then(m => ({ default: m.ImportPartiesPage })));
const LazyImportProductsPage = React.lazy(() => import('../features/import/ImportProductsPage').then(m => ({ default: m.ImportProductsPage })));
const LazyOtherIncomePage = React.lazy(() => import('../features/otherIncome/OtherIncomePage').then(m => ({ default: m.OtherIncomePage })));
const LazyStaffDashboardPage = React.lazy(() => import('../features/staff/StaffDashboardPage').then(m => ({ default: m.StaffDashboardPage })));
const LazyDeliveryOrdersPage = React.lazy(() => import('../features/deliveryOrders/DeliveryOrdersPage').then(m => ({ default: m.DeliveryOrdersPage })));
const LazySocialPostPage = React.lazy(() => import('../features/social/SocialPostPage').then(m => ({ default: m.SocialPostPage })));
const LazyCategoriesPage = React.lazy(() => import('../features/inventory/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const LazyTranslationsPage = React.lazy(() => import('../features/translations/TranslationsPage').then(m => ({ default: m.TranslationsPage })));

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

function PurchaseRoleRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
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
                <Route path={ADMIN_ROUTE_PATHS.oauthConsent} element={<OAuthConsentPage />} />
                <Route path={ADMIN_ROUTE_PATHS.resetPassword} element={<ResetPasswordPage />} />
                <Route path={ADMIN_ROUTE_PATHS.canvaCallback} element={<AuthGuard><LazyRoute><LazyCanvaConnectionPage /></LazyRoute></AuthGuard>} />
                <Route path={ADMIN_ROUTE_PATHS.root} element={<AuthGuard><Layout /></AuthGuard>}>
                  <Route path={ADMIN_ROUTE_PATHS.quickPos} element={<LazyRoute><LazyQuickPosPage /></LazyRoute>} />
                  <Route index element={<LazyRoute><LazyDashboardPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.dashboardV2} element={<LazyRoute><LazyDashboardV2Page /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.deliveryOrders} element={<LazyRoute><LazyDeliveryOrdersPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.productsAlias.slice(1)} element={<Navigate to={ADMIN_ROUTE_PATHS.inventory} replace />} />
                  <Route path={ADMIN_ROUTE_PATHS.sales} element={<LazyRoute><LazySalesHistoryPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.competitorPrices} element={<LazyRoute><LazyCompetitorPricesPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.inventory} element={<LazyRoute><LazyInventoryListPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.missingImages} element={<LazyRoute><LazyMissingImagesPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.stockHistory} element={<LazyRoute><LazyStockHistoryPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.categories} element={<LazyRoute><LazyCategoriesPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.supplierLedger} element={<LazyRoute><LazySupplierLedgerPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.customerLedger} element={<LazyRoute><LazyCustomerLedgerPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.collections} element={<LazyRoute><LazyCollectionsWorkspace /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.purchase} element={<PurchaseRoleRoute><LazyRoute><LazyPurchaseEntryPage /></LazyRoute></PurchaseRoleRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.purchaseHistory} element={<PurchaseRoleRoute><LazyRoute><LazyPurchaseHistoryPage /></LazyRoute></PurchaseRoleRoute>} />
                  
                  <Route path={ADMIN_ROUTE_PATHS.finance} element={<LazyRoute><LazyFinanceDashboardPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.settings} element={<LazyRoute><LazySettingsPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.canvaDesigns} element={<LazyRoute><LazyCanvaDesignPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.canvaConnect} element={<LazyRoute><LazyCanvaConnectionPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.reports} element={<LazyRoute><LazyReportsPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.reminders} element={<LazyRoute><LazyRemindersPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.importAlias.slice(1)} element={<Navigate to={ADMIN_ROUTE_PATHS.importProducts} replace />} />
                  <Route path={ADMIN_ROUTE_PATHS.importParties} element={<LazyRoute><LazyImportPartiesPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.importProducts} element={<LazyRoute><LazyImportProductsPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.otherIncome} element={<LazyRoute><LazyOtherIncomePage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.staff} element={<LazyRoute><LazyStaffDashboardPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.socialPost} element={<LazyRoute><LazySocialPostPage /></LazyRoute>} />
                  <Route path={ADMIN_ROUTE_PATHS.translations} element={<LazyRoute><LazyTranslationsPage /></LazyRoute>} />
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
