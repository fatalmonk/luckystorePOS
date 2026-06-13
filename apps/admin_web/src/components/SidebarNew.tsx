import React, { useState, useEffect } from 'react';
import { clsx } from "clsx";
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/AuthContext';
import { 
  ChevronLeft, ChevronRight, GitBranch, LayoutDashboard, ShoppingCart, 
  Package, Warehouse, PlusCircle, Wallet, Users, PhoneCall, Settings, 
  LogOut, Monitor, Receipt, Bell, BarChart3, ShoppingBag, TrendingDown,
  Database, Banknote, ChevronDown, ChevronUp, ShieldCheck, HelpCircle, FileText
} from 'lucide-react';

interface SidebarNewProps {
  isMobile: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hidden: boolean;
  onClose: () => void;
}

interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  children?: { label: string; path: string }[];
}

interface NavGroup {
  id: string;
  titleKey: string;
  icon: React.ComponentType<any>;
  items: NavItem[];
}

function useNavGroups(): NavGroup[] {
  const { t } = useTranslation();
  return [
    {
      id: 'business',
      titleKey: 'nav.groupBusiness', // "Business" or fallback t('nav.business')
      icon: LayoutDashboard,
      items: [
        { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/' },
        { icon: Monitor, label: t('nav.quickPos'), path: '/pos' },
        { icon: ShoppingBag, label: t('nav.deliveryOrders', 'Delivery Orders'), path: '/delivery-orders' },
        { icon: TrendingDown, label: t('nav.competitorPrices'), path: '/competitor-prices' },
      ]
    },
    {
      id: 'inventory_sales',
      titleKey: 'nav.groupInventorySales', // "Inventory & Sales"
      icon: Package,
      items: [
        { icon: Warehouse, label: t('nav.inventory'), path: '/inventory', children: [
          { label: t('nav.list'), path: '/inventory' },
          { label: t('nav.stockHistory'), path: '/inventory/history' },
        ] },
        { icon: PlusCircle, label: t('nav.purchase'), path: '/purchase', children: [
          { label: t('nav.newEntry'), path: '/purchase' },
          { label: t('nav.purchaseHistory'), path: '/purchase/history' },
        ] },
        { icon: ShoppingCart, label: t('nav.sales'), path: '/sales' },
        { icon: BarChart3, label: t('nav.dailySales'), path: '/daily-sales' },
      ]
    },
    {
      id: 'finance',
      titleKey: 'nav.finance', // "Finance"
      icon: Wallet,
      items: [
        { icon: Receipt, label: t('nav.expenses'), path: '/expenses' },
        { icon: Wallet, label: t('nav.supplierLedger'), path: '/finance/suppliers' },
        { icon: Users, label: t('nav.customerLedger'), path: '/finance/customers' },
        { icon: PhoneCall, label: t('nav.collections'), path: '/collections' },
        { icon: Banknote, label: t('nav.otherIncome'), path: '/other-income' },
      ]
    },
    {
      id: 'management',
      titleKey: 'nav.groupManagement', // "Management"
      icon: ShieldCheck,
      items: [
        { icon: BarChart3, label: t('nav.reports'), path: '/reports' },
        { icon: Users, label: t('nav.manageStaff'), path: '/staff' },
        { icon: Database, label: t('nav.dataManagement'), path: '/import', children: [
          { label: t('nav.importProducts'), path: '/import/products' },
          { label: t('nav.importParties'), path: '/import/parties' },
        ] },
      ]
    },
    {
      id: 'system',
      titleKey: 'nav.groupSystem', // "System"
      icon: Settings,
      items: [
        { icon: Settings, label: t('nav.settings'), path: '/settings' },
        { icon: Bell, label: t('nav.reminders', 'Reminders'), path: '/reminders' },
      ]
    }
  ];
}

export const SidebarNew: React.FC<SidebarNewProps> = ({ 
  isMobile, 
  collapsed, 
  onToggleCollapse, 
  hidden, 
  onClose 
}) => {
  const { signOut } = useAuth();
  const navGroups = useNavGroups();
  const location = useLocation();
  const { t } = useTranslation();

  // Helper to check if a route is active or if any child sub-route is active
  const isRouteActive = (path: string, hasChildren = false) => {
    if (hasChildren) {
      return location.pathname.startsWith(path);
    }
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Helper to check if any item in a nav group is active
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => {
      if (isRouteActive(item.path, !!item.children)) return true;
      if (item.children) {
        return item.children.some(child => isRouteActive(child.path));
      }
      return false;
    });
  };

  // State to track which accordions are manually toggled / expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-expand the group that contains the active route
  useEffect(() => {
    const activeGroup = navGroups.find(group => isGroupActive(group));
    if (activeGroup) {
      setExpandedGroups(prev => ({
        ...prev,
        [activeGroup.id]: true
      }));
    }
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && !hidden && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 19,
          }}
        />
      )}
      <aside
        className={clsx(
          'sidebar',
          hidden ? 'sidebar--hidden' : '',
          !isMobile && collapsed ? 'sidebar-collapsed' : '',
          '!bg-warm-surface !border-warm-border-warm flex flex-col h-full transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]'
        )}
      >
        {/* Sidebar Header */}
        <div className={clsx('p-4 border-b border-warm-border-warm flex items-center justify-between gap-3', collapsed && 'flex-col justify-center')}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-warm-accent shadow-level-2 transform -rotate-6 flex-shrink-0">
              <ShoppingBag className="text-white" size={18} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <h2 className="text-sm font-display font-black text-warm-fg tracking-tight leading-tight truncate">Lucky Store</h2>
                <p className="text-[9px] text-warm-muted font-bold uppercase tracking-widest opacity-75 truncate">Admin Portal</p>
              </div>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              className={clsx(
                'p-1.5 rounded-lg text-warm-muted hover:bg-warm-border-warm hover:text-warm-fg transition-colors flex-shrink-0',
                collapsed ? 'mt-2' : ''
              )}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Navigation Groups / Accordions */}
        <div className="sidebar-nav-container !p-3 space-y-2 scrollbar-thin">
          {navGroups.map((group) => {
            const isExpanded = !!expandedGroups[group.id];
            const isAnyActive = isGroupActive(group);

            return (
              <div key={group.id} className="flex flex-col gap-1 border-b border-warm-border-warm/20 pb-2 last:border-0 last:pb-0">
                {collapsed ? (
                  // Collapsed Mode: Just render icon triggers or flat items
                  <div className="flex flex-col gap-1 items-center">
                    {group.items.map((item) => {
                      const isActive = isRouteActive(item.path, !!item.children);
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => { if (isMobile) onClose?.(); }}
                          className={clsx(
                            'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200',
                            isActive
                              ? 'bg-warm-accent text-white shadow-sm'
                              : 'text-warm-muted hover:bg-warm-border-warm hover:text-warm-fg'
                          )}
                          title={item.label}
                          aria-label={item.label}
                        >
                          <item.icon size={18} className="flex-shrink-0" />
                        </NavLink>
                      );
                    })}
                  </div>
                ) : (
                  // Expanded Mode: Collapsible Accordion Group
                  <>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={clsx(
                        'w-full flex items-center justify-between py-2 px-3 rounded-lg text-left transition-all duration-200',
                        isAnyActive 
                          ? 'bg-warm-accent/5 text-warm-accent font-semibold' 
                          : 'text-warm-muted hover:bg-warm-border-warm/50 hover:text-warm-fg'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <group.icon size={16} className={clsx('flex-shrink-0', isAnyActive ? 'text-warm-accent' : 'text-warm-dim')} />
                        <span className="text-xs uppercase tracking-wider font-bold truncate">
                          {group.titleKey.startsWith('nav.') ? t(group.titleKey, group.titleKey.replace('nav.group', '')) : group.titleKey}
                        </span>
                      </div>
                      <div className="flex-shrink-0 text-warm-dim">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <nav className="flex flex-col gap-1 pl-2 mt-1 border-l border-warm-border-warm/40 ml-4 animate-fade-in transition-all duration-200">
                        {group.items.map((item) => {
                          const isActive = isRouteActive(item.path, !!item.children);
                          return (
                            <div key={item.path} className="flex flex-col gap-1">
                              <NavLink
                                to={item.path}
                                onClick={() => { if (isMobile) onClose?.(); }}
                                className={clsx(
                                  'flex items-center gap-2.5 py-1.5 px-2.5 rounded-md transition-all duration-200 text-xs font-semibold',
                                  isActive
                                    ? 'bg-warm-bg text-warm-accent border-l-[3px] border-warm-accent pl-[7px]'
                                    : 'text-warm-muted hover:bg-warm-border-warm/40 hover:text-warm-fg'
                                )}
                                end={!item.children}
                              >
                                <item.icon size={15} className="flex-shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </NavLink>

                              {/* Render children sub-menus */}
                              {item.children && (
                                <div className="sidebar-nav-children ml-5 border-l border-warm-border-warm/60 pl-2.5 my-0.5 flex flex-col gap-1">
                                  {item.children.map((child) => {
                                    const isChildActive = isRouteActive(child.path);
                                    return (
                                      <NavLink
                                        key={child.path}
                                        to={child.path}
                                        onClick={() => { if (isMobile) onClose?.(); }}
                                        className={clsx(
                                          'text-[11px] font-semibold py-1 px-2 rounded-md transition-colors duration-200',
                                          isChildActive
                                            ? 'text-warm-accent bg-warm-bg'
                                            : 'text-warm-dim hover:text-warm-fg hover:bg-warm-border-warm/40'
                                        )}
                                      >
                                        {child.label}
                                      </NavLink>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </nav>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer – branch selector & user menu */}
        <footer className="mt-auto p-4 border-t border-warm-border-warm flex flex-col gap-3">
          {/* Branch selector */}
          <div className={clsx('flex items-center gap-2 text-xs', collapsed && 'justify-center')}>
            <span className="w-2 h-2 rounded-full bg-warm-success flex-shrink-0" title="online"></span>
            <GitBranch className="text-warm-accent flex-shrink-0" size={16} />
            {!collapsed && (
              <div className="flex-1 flex justify-between items-center min-w-0">
                <span className="truncate text-warm-fg font-semibold">Main Store</span>
                <button className="text-warm-accent hover:text-warm-accent-light hover:underline font-bold text-[10px] uppercase tracking-wider" onClick={() => {/* placeholder */}}>
                  Switch
                </button>
              </div>
            )}
          </div>

          {/* User profile & Logout */}
          <div className={clsx('flex items-center gap-2 border-t border-warm-border/50 pt-3', collapsed && 'flex-col justify-center')}>
            <div className="avatar flex items-center justify-center rounded-full bg-warm-accent text-white font-bold text-xs w-7 h-7 flex-shrink-0">
              M
            </div>
            {!collapsed ? (
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="truncate text-warm-fg text-xs font-bold leading-tight">Mohammed</span>
                <span className="truncate text-[10px] text-warm-muted">Store Manager</span>
              </div>
            ) : null}
            
            <button
              onClick={signOut}
              className={clsx(
                'text-warm-danger hover:bg-warm-danger/10 transition-colors rounded-lg flex items-center justify-center flex-shrink-0',
                collapsed ? 'p-1 mt-1' : 'p-1.5'
              )}
              title="Logout Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
};

export default SidebarNew;
