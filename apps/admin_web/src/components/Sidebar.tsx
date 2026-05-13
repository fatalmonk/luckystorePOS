import { useTranslation } from 'react-i18next';
import { LayoutDashboard, ShoppingCart, Package, Warehouse, PlusCircle, Wallet, Users, PhoneCall, Settings, LogOut, Monitor, Receipt, Bell, BarChart3, ShoppingBag } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import '../styles/layout.css';

interface NavItem {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  path: string;
  children?: { label: string; path: string }[];
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

function useNavGroups(): NavGroup[] {
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

interface SidebarProps {
  hidden?: boolean;
  onClose?: () => void;
}

export function Sidebar({ hidden = false, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navGroups = useNavGroups();

  return (
    <>
      {/* Mobile overlay backdrop */}
      {!hidden && (
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
      <aside className={`sidebar ${hidden ? 'sidebar--hidden' : ''}`}>
        <div className="sidebar-header">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-default shadow-level-2 transform -rotate-6 flex-shrink-0">
              <ShoppingBag className="text-primary-on" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight leading-tight">Lucky Store</h2>
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest opacity-60">Admin Portal</p>
            </div>
          </div>
        </div>

        <div className="sidebar-nav-container">
          {navGroups.map((group) => (
                <div key={group.titleKey} className="sidebar-nav-group">
                  <h3 className="sidebar-nav-title">{group.titleKey}</h3>
                  <nav className="sidebar-nav flex flex-col gap-1">
                {group.items.map((item) => (
                  <div key={item.path} className="flex flex-col gap-1">
                    <NavLink
                      to={item.path}
                      onClick={() => { if (window.innerWidth < 768) onClose?.(); }}
                      className={({ isActive }) =>
                        `sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-primary-default text-primary-on shadow-level-1'
                            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                        }`
                      }
                      end={!item.children}
                    >
                      <item.icon size={20} />
                      <span className="font-semibold text-sm">{item.label}</span>
                    </NavLink>
                    {item.children && (
                      <div className="sidebar-nav-children ml-7 border-l border-neutral-800 pl-4 my-1 flex flex-col gap-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={() => { if (window.innerWidth < 768) onClose?.(); }}
                            className={({ isActive }) =>
                              `sidebar-nav-item text-xs font-medium py-1.5 px-2 rounded-md transition-colors ${
                                isActive
                                  ? 'text-primary-default'
                                  : 'text-neutral-500 hover:text-neutral-300'
                              }`
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

        <div className="sidebar-footer">
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-danger-default hover:bg-danger/10 transition-colors font-bold text-sm"
          >
            <LogOut size={20} />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
