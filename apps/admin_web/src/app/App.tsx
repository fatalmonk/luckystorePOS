import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { Layout } from '../components/Layout';
import { DashboardPage } from '../features/dashboard/DashboardPage';

import { AuthGuard } from './AuthGuard';

import { ProductListPage } from '../features/products/ProductListPage';

import { InventoryListPage } from '../features/inventory/InventoryListPage';
import { StockHistoryPage } from '../features/inventory/StockHistoryPage';

import { SalesHistoryPage } from '../features/sales/SalesHistoryPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { OAuthConsentPage } from '../features/oauth/OAuthConsentPage';

import { NotificationProvider } from '../components/Notification';

export function App() {
  return (
    <QueryProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AuthGuard>
            <Routes>
              <Route path="/oauth/consent" element={<OAuthConsentPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="sales" element={<SalesHistoryPage />} />
                <Route path="products" element={<ProductListPage />} />
                <Route path="inventory" element={<InventoryListPage />} />
                <Route path="inventory/history" element={<StockHistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </AuthGuard>
        </BrowserRouter>
      </NotificationProvider>
    </QueryProvider>
  );
}

export default App;
