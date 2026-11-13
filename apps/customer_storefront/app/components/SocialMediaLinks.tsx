import { FacebookLogo } from '@phosphor-icons/react/dist/ssr/FacebookLogo';
import { InstagramLogo } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { WhatsappLogo } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

const socialLinks = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/luckystore1947',
    icon: FacebookLogo,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/luckystore1947',
    icon: InstagramLogo,
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/8801731944544',
    icon: WhatsappLogo,
  },
] as const;

export function SocialMediaLinks({
  locale = 'en',
  variant = 'auth',
}: {
  locale?: 'en' | 'bn';
  variant?: 'auth' | 'footer';
}) {
  const label = locale === 'bn' ? 'লাকি স্টোরের সঙ্গে যুক্ত থাকুন' : 'Connect with Lucky Store';
  const isFooter = variant === 'footer';

  return (
    <div className={isFooter ? 'flex items-center gap-2.5' : 'mt-6 border-t border-warm-border/70 pt-5'}>
      {!isFooter && <p className="text-center text-xs font-medium text-warm-muted">{label}</p>}
      <nav
        className={isFooter ? 'flex items-center gap-2.5' : 'mt-3 flex items-center justify-center gap-3'}
        aria-label={isFooter ? 'Lucky Store on social media' : label}
      >
        {socialLinks.map(({ label: socialLabel, href, icon: Icon }) => (
          <a
            key={socialLabel}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={socialLabel}
            title={socialLabel}
            className={isFooter
              ? 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0B0B0D] text-white transition-colors hover:bg-warm-accent hover:text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-campaign-surface)]'
              : 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-warm-border bg-warm-bg text-warm-muted transition-colors hover:border-warm-accent hover:text-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent'}
          >
            <Icon size={isFooter ? 20 : 19} weight="fill" aria-hidden="true" />
          </a>
        ))}
      </nav>
    </div>
  );
}
