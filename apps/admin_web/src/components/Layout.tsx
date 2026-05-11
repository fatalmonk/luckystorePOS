import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';

export function Layout() {
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    // Default to hidden on mobile, visible on desktop
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On desktop, keep user's preference; don't auto-hide
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`app-container ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <Sidebar hidden={sidebarHidden} onClose={() => setSidebarHidden(true)} />
      <TopHeader onToggleSidebar={() => setSidebarHidden(h => !h)} sidebarHidden={sidebarHidden} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
