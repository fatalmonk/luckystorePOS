import { BottomNavShell } from './BottomNavShell';
import { ActiveLink } from './ActiveLink';
import { BottomNavCartPill } from './BottomNavCartPill';

const navItems = [
  { icon: '🏠', label: 'Home', href: '/' },
  { icon: '📂', label: 'Browse', href: '/category' },
  { icon: '🛒', label: 'Cart', href: '/cart', showBadge: true },
  { icon: '📋', label: 'Orders', href: '/order' },
];

export function BottomNav() {
  return (
    <BottomNavShell>
      <BottomNavCartPill />
      <nav className="h-[64px] glass border-t flex items-center justify-around flex-shrink-0 z-50" aria-label="Primary navigation">
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
