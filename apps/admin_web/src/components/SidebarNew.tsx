import React from 'react';
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/AuthContext';
import { 
  ChevronLeft, ChevronRight, GitBranch, LayoutDashboard, ShoppingCart, 
  Package, Warehouse, PlusCircle, Wallet, Users, PhoneCall, Settings, 
  LogOut, Monitor, Receipt, Bell, BarChart3, ShoppingBag, TrendingDown 
} from 'lucide-react';

interface SidebarNewProps {
  isMobile: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hidden: boolean;
  onClose: () => void;
}

function useNavGroups() {
  const { t } = useTranslation();
  return [
    {
      titleKey: t('nav.overview'),
      items: [
        { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/' },
        { icon: Monitor, label: t('nav.quickPos'), path: '/pos' },
      ]
    },
    {
      titleKey: t('nav.business'),
      items: [
        { icon: ShoppingCart, label: t('nav.sales'), path: '/sales' },
        { icon: BarChart3, label: t('nav.dailySales'), path: '/daily-sales' },
        { icon: Package, label: t('nav.products'), path: '/products' },
        { icon: TrendingDown, label: t('nav.competitorPrices'), path: '/competitor-prices' },
        { icon: Warehouse, label: t('nav.inventory'), path: '/inventory', children: [
          { label: t('nav.inventory'), path: '/inventory' },
          { label: t('nav.history'), path: '/inventory/history' },
        ] },
        { icon: PlusCircle, label: t('nav.purchase'), path: '/purchase', children: [
          { label: t('nav.purchase'), path: '/purchase' },
          { label: t('nav.history'), path: '/purchase/history' },
        ] },
      ]
    },
    {
      titleKey: t('nav.finance'),
      items: [
        { icon: Receipt, label: t('nav.expenses'), path: '/expenses' },
        { icon: Wallet, label: t('nav.supplierLedger'), path: '/finance/suppliers' },
        { icon: Users, label: t('nav.customerLedger'), path: '/finance/customers' },
        { icon: PhoneCall, label: t('nav.collections'), path: '/collections' },
      ]
    },
    {
      titleKey: t('nav.other'),
      items: [
        { icon: Bell, label: t('nav.reminders'), path: '/reminders' },
        { icon: BarChart3, label: t('nav.reports'), path: '/reports' },
        { icon: Settings, label: t('nav.settings'), path: '/settings' },
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

        {/* Navigation Groups */}
        <div className="sidebar-nav-container !p-3 space-y-4 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.titleKey} className="flex flex-col gap-1">
              {!collapsed && (
                <h3 className="text-[10px] text-warm-dim font-bold uppercase tracking-widest px-3 mb-1 mt-2 opacity-75">
                  {group.titleKey}
                </h3>
              )}
              <nav className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <div key={item.path} className="flex flex-col gap-1">
                    <NavLink
                      to={item.path}
                      onClick={() => { if (isMobile) onClose?.(); }}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium',
                          collapsed 
                            ? 'justify-center px-2' 
                            : 'px-3 border-l-[3px]',
                          collapsed && isActive && 'bg-warm-border-warm text-warm-accent',
                          collapsed && !isActive && 'text-warm-muted hover:bg-warm-border-warm hover:text-warm-fg',
                          !collapsed && isActive && 'border-warm-accent bg-warm-bg text-warm-accent pl-[9px]',
                          !collapsed && !isActive && 'border-transparent text-warm-muted hover:bg-warm-border-warm hover:text-warm-fg'
                        )
                      }
                      end={!item.children}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                    
                    {/* Render children sub-menus */}
                    {!collapsed && item.children && (
                      <div className="sidebar-nav-children ml-6 border-l border-warm-border-warm pl-3 my-1 flex flex-col gap-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={() => { if (isMobile) onClose?.(); }}
                            className={({ isActive }) =>
                              clsx(
                                'text-xs font-semibold py-1.5 px-2 rounded-md transition-colors duration-200',
                                isActive
                                  ? 'text-warm-accent bg-warm-bg'
                                  : 'text-warm-dim hover:text-warm-fg hover:bg-warm-border-warm'
                              )
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer – branch selector & user menu */}
        <footer className="p-4 border-t border-warm-border-warm flex flex-col gap-3">
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
