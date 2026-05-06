import { LayoutDashboard, ShoppingCart, Package, Warehouse, PlusCircle, Wallet, Users, PhoneCall, Settings, LogOut, Monitor, Receipt, Bell, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import '../styles/layout.css';

const navGroups = [
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
      { icon: Warehouse, label: 'Inventory', path: '/inventory' },
      { icon: PlusCircle, label: 'Purchase', path: '/purchase' },
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
        <h2 style={{ color: 'white', fontWeight: 700, fontSize: 'var(--font-size-lg)', marginBottom: '4px' }}>Lucky Store</h2>
        <p style={{ color: 'var(--text-sidebar)', fontSize: 'var(--font-size-sm)' }}>Admin Panel</p>
      </div>

      <div className="sidebar-nav-container">
        {navGroups.map((group) => (
          <div key={group.title} className="sidebar-nav-group">
            <h3 className="sidebar-nav-title">{group.title}</h3>
            <nav className="sidebar-nav">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item'
                  }
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button onClick={signOut} style={{ color: 'var(--text-sidebar)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)' }}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
