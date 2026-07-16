import { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Icon({ size = 24, className = '', children, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${className}`}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function BeverageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="2" x2="6" y2="4" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="14" y1="2" x2="14" y2="4" />
    </Icon>
  );
}

export function SnackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
      <circle cx="10" cy="16" r="1" fill="currentColor" />
    </Icon>
  );
}

export function DairyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 22h8a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
      <path d="M10 8V5a2 2 0 0 1 4 0v3" />
    </Icon>
  );
}

export function PersonalCareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 22h8" />
      <path d="M7 10h10v8a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3v-8z" />
      <path d="M9 6h6" />
      <path d="M10 2h4v4h-4z" />
    </Icon>
  );
}

export function RiceGrainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2C7 7 7 13 12 22" />
      <path d="M12 22c5-9 5-15 0-20" />
      <path d="M12 7c-3 2-3 5 0 10" />
      <path d="M12 17c3-5 3-8 0-10" />
    </Icon>
  );
}

export function ElectronicsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </Icon>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m21 16-9 5-9-5V8l9-5 9 5v8z" />
      <polyline points="3 8 12 13 21 8" />
      <line x1="12" y1="22" x2="12" y2="13" />
    </Icon>
  );
}

export function CategoryIcon({ slug, emoji, size = 24, className }: { slug?: string; emoji?: string | null; size?: number; className?: string }) {
  const iconClass = `transition-transform duration-500 group-hover:scale-110 ${className || ''}`;

  switch (slug) {
    case 'beverages':
      return <BeverageIcon size={size} className={iconClass} />;
    case 'snacks':
      return <SnackIcon size={size} className={iconClass} />;
    case 'dairy':
      return <DairyIcon size={size} className={iconClass} />;
    case 'personal-care':
      return <PersonalCareIcon size={size} className={iconClass} />;
    case 'rice-grain':
    case 'rice':
      return <RiceGrainIcon size={size} className={iconClass} />;
    case 'electronics':
      return <ElectronicsIcon size={size} className={iconClass} />;
    default:
      return emoji ? <span className={`text-xl ${className || ''}`} aria-hidden="true">{emoji}</span> : <PackageIcon size={size} className={iconClass} />;
  }
}
