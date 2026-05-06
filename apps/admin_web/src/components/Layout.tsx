import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';

export function Layout() {
  return (
    <div className="app-container">
      <Sidebar />
      <TopHeader />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
