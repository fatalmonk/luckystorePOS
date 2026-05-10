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
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Monitor, label: 'Quick POS', path: '/pos' },
    ]
  },
  {
    title: 'Business',
    items: [
      { icon: ShoppingCart, label: 'Sales', path: '/sales' },
      { icon: Package, label: 'Products', path: '/products' },
      { icon: Warehouse, label: 'Inventory', path: '/inventory', children: [
        { label: 'Current Stock', path: '/inventory' },
        { label: 'History', path: '/inventory/history' },
      ] },
      { icon: PlusCircle, label: 'Purchase', path: '/purchase', children: [
        { label: 'New Purchase', path: '/purchase' },
        { label: 'History', path: '/purchase/history' },
      ] },
    ]
  },
  {
    title: 'Finance',
    items: [
      { icon: Receipt, label: 'Expenses', path: '/expenses' },
      { icon: Wallet, label: 'Supplier Ledger', path: '/finance/suppliers' },
      { icon: Users, label: 'Customer Ledger', path: '/finance/customers' },
      { icon: PhoneCall, label: 'Collections', path: '/collections' },
    ]
  },
  {
    title: 'Other',
    items: [
      { icon: Bell, label: 'Reminders', path: '/reminders' },
      { icon: BarChart3, label: 'Reports', path: '/reports' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ]
  }
];

export function Sidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-default shadow-level-2 transform -rotate-6">
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
          <div key={group.title} className="sidebar-nav-group">
            <h3 className="sidebar-nav-title">{group.title}</h3>
            <nav className="sidebar-nav flex flex-col gap-1">
              {group.items.map((item) => (
                <div key={item.path} className="flex flex-col gap-1">
                  <NavLink
                    to={item.path}
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
  );
}
