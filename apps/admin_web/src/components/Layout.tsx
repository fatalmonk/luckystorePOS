import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopHeader } from './TopHeader';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';

export function Layout() {
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    return window.innerWidth < 768;
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !sidebarHidden) {
        setSidebarHidden(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarHidden]);

  return (
    <div className={`app-container ${sidebarHidden ? 'sidebar-hidden' : ''} ${isMobile ? 'mobile-layout' : ''}`}>
      <Sidebar hidden={sidebarHidden} onClose={() => setSidebarHidden(true)} />
      <TopHeader onToggleSidebar={() => setSidebarHidden(h => !h)} sidebarHidden={sidebarHidden} />
      <main className="main-content">
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
}
