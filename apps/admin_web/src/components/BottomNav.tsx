import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, Wallet, Send } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: ShoppingCart, label: 'POS', path: '/pos' },
  { icon: Users, label: 'Customers', path: '/finance/customers' },
  { icon: Wallet, label: 'Finance', path: '/expenses' },
  { icon: Send, label: 'Social', path: '/social-post' },
];

export function BottomNav() {
  const location = useLocation();
  
  // Hide on login page
  if (location.pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-warm-surface border-t border-warm-border-warm">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          location.pathname.startsWith(item.path + '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] transition-colors ${
                isActive 
                  ? 'text-warm-accent' 
                  : 'text-warm-muted hover:text-warm-fg'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
