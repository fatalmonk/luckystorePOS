import { BottomNavShell } from './BottomNavShell';
import { ActiveLink } from './ActiveLink';
import { BottomNavCartPill } from './BottomNavCartPill';
import { HomeIcon, BrowseIcon, CartIcon, OrdersIcon } from './icons';

const navItems = [
  { icon: <HomeIcon size={22} />, label: 'Home', href: '/' },
  { icon: <BrowseIcon size={22} />, label: 'Browse', href: '/category' },
  { icon: <CartIcon size={22} />, label: 'Cart', href: '/cart', showBadge: true },
  { icon: <OrdersIcon size={22} />, label: 'Orders', href: '/order' },
];

export function BottomNav() {
  return (
    <BottomNavShell>
      <BottomNavCartPill />
      <nav className="h-[60px] bg-warm-surface/95 backdrop-blur-xl border-t border-warm-border/40 flex items-center justify-around flex-shrink-0 z-50" aria-label="Primary navigation">
        {navItems.map((item) => (
          <ActiveLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            showBadge={item.showBadge}
          />
        ))}
      </nav>
    </BottomNavShell>
  );
}
