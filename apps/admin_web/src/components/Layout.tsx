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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (isPosPage) return true;
    const width = window.innerWidth;
    return width >= 768 && width < 1024;
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobile(mobile);
      if (mobile) {
        if (!sidebarHidden) {
          setSidebarHidden(true);
        }
        setSidebarCollapsed(false);
      } else {
        if (width >= 768 && width < 1024) {
          setSidebarCollapsed(true);
        } else if (width >= 1024 && !isPosPage) {
          setSidebarCollapsed(false);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarHidden, isPosPage]);

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
