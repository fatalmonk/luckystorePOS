import { useState, useEffect, useLayoutEffect } from 'react';
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
  
  const [sidebarHidden, setSidebarHidden] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  
  // Persist sidebar collapse preference
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (isPosPage) return true;
    // Check saved preference first
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) return saved === 'true';
    // Fallback to responsive default
    const width = window.innerWidth;
    return width >= 768 && width < 1024;
  });

  const setSidebarCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(sidebarCollapsed) : value;
    localStorage.setItem('sidebar-collapsed', String(newValue));
    setSidebarCollapsedState(newValue);
  };

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobile(mobile);
      if (mobile) {
        if (!sidebarHidden) {
          setSidebarHidden(true);
        }
        setSidebarCollapsedState(false);
      }
      // Don't force collapse state on desktop — respect user's preference
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarHidden]);

  // Force sidebar collapse when entering POS mode (desktop), but save preference
  useLayoutEffect(() => {
    if (isPosPage && !isMobile) {
      // Save current preference before forcing collapse
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== 'true') {
        localStorage.setItem('sidebar-collapsed-restore', saved || 'false');
      }
      // Defer state update to avoid cascading renders warning
      setTimeout(() => setSidebarCollapsedState(true), 0);
    } else if (!isPosPage && !isMobile) {
      // Restore previous preference when leaving POS
      const restore = localStorage.getItem('sidebar-collapsed-restore');
      if (restore !== null) {
        // Defer state update to avoid cascading renders warning
        setTimeout(() => setSidebarCollapsedState(restore === 'true'), 0);
        localStorage.removeItem('sidebar-collapsed-restore');
      }
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
