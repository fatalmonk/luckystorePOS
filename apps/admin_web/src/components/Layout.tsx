import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarNew } from './SidebarNew';
import { BottomNav } from './BottomNav';
import { TopHeader } from './TopHeader';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';

export function Layout() {
  const location = useLocation();
  const isPosPage = location.pathname.includes('/pos');
  
  const [sidebarHidden, setSidebarHidden] = useState(() => window.innerWidth < 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isPosPage);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !sidebarHidden) {
        setSidebarHidden(true);
      }
      if (mobile) {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarHidden]);

  // Force sidebar collapse when entering POS mode (desktop)
  useEffect(() => {
    if (isPosPage && !isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isPosPage, isMobile]);

  return (
    <div className={`app-container app-warm ${sidebarHidden ? 'sidebar-hidden' : ''} ${isMobile ? 'mobile-layout' : ''} ${!isMobile && sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <SidebarNew 
        isMobile={isMobile} 
        collapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(c => !c)} 
        hidden={sidebarHidden}
        onClose={() => setSidebarHidden(true)}
      />
      <TopHeader 
        onToggleSidebar={() => setSidebarHidden(h => !h)} 
        sidebarHidden={sidebarHidden}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
      />
      <main className={`main-content ${isPosPage ? 'pos-main-content' : ''}`}>
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
}
