import { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  
  // Persist sidebar hidden preference across page refresh
  const [sidebarHidden, setSidebarHiddenState] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isMobileView = window.innerWidth < 768;
    if (isMobileView) return true;
    const saved = localStorage.getItem('sidebar-hidden');
    if (saved !== null) return saved === 'true';
    return false;
  });

  const setSidebarHidden = (value: boolean | ((prev: boolean) => boolean)) => {
    setSidebarHiddenState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        localStorage.setItem('sidebar-hidden', String(newValue));
      }
      return newValue;
    });
  };
  
  // Persist sidebar collapse preference across page refresh
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
    setSidebarCollapsedState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        localStorage.setItem('sidebar-collapsed', String(newValue));
      }
      return newValue;
    });
  };

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Hide header on scroll down, show on scroll up
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const mainEl = document.querySelector('.main-content');
    if (!mainEl) return;

    const SCROLL_THRESHOLD = 8;
    const TOP_ZONE = 40;

    // Reset on route change before attaching listener
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeaderVisible(true);
    lastScrollYRef.current = 0;

    const handleScroll = () => {
      if (tickingRef.current) return;

      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const currentScrollY = mainEl.scrollTop;
        const diff = currentScrollY - lastScrollYRef.current;

        if (currentScrollY <= TOP_ZONE) {
          setHeaderVisible(true);
        } else if (Math.abs(diff) >= SCROLL_THRESHOLD) {
          if (diff > 0) {
            // Scrolling down -> hide header
            setHeaderVisible(false);
          } else {
            // Scrolling up -> show header
            setHeaderVisible(true);
          }
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);


  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarHiddenState(true);
        setSidebarCollapsedState(false);
      } else {
        const savedHidden = localStorage.getItem('sidebar-hidden');
        if (savedHidden !== null) {
          setSidebarHiddenState(savedHidden === 'true');
        }
        const savedCollapsed = localStorage.getItem('sidebar-collapsed');
        if (savedCollapsed !== null) {
          setSidebarCollapsedState(savedCollapsed === 'true');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className={`app-container overflow-x-hidden w-full max-w-full app-warm ${sidebarHidden ? 'sidebar-hidden' : ''} ${isMobile ? 'mobile-layout' : ''} ${!isMobile && sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
        hidden={!headerVisible}
      />
      <main className={`main-content ${isPosPage ? 'pos-main-content' : ''}`}>
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
}
