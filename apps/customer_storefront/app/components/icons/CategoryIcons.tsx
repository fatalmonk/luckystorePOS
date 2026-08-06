import React, { SVGProps } from 'react';

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
      strokeWidth={1.8}
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

export function IceCreamIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21v-7" />
      <path d="M8.5 14.5c-1-2.5-.5-5.5 1.5-7 1.5-1.2 4-1.2 5.5 0 2 1.5 2.5 4.5 1.5 7" />
      <path d="M7 14.5h10" />
    </Icon>
  );
}

export function BeverageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 21h8" />
      <path d="M7 3h10v5.5c0 3-2.5 5.5-5 5.5s-5-2.5-5-5.5V3Z" />
      <path d="M12 13.5V21" />
      <path d="M9 7h6" />
    </Icon>
  );
}

export function SnackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 12h20" />
      <path d="M6 12c0-4 3-7 6-7s6 3 6 7" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ChipsPretzelsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3l3 2 3-2 3 2 3-2v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 10c1.5-1 4.5-1 6 0" />
      <path d="M9 14c1.5 1 4.5 1 6 0" />
    </Icon>
  );
}

export function CondimentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10h16" />
      <path d="M6 10V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" />
      <path d="M7 10v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8" />
    </Icon>
  );
}

export function EnergyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 2 4.09 12.11a.5.5 0 0 0 .39.89H11l-1 9 8.91-10.11a.5.5 0 0 0-.39-.89H13l1-9Z" />
    </Icon>
  );
}

export function BiscuitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ChocolateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v14" />
      <path d="M12 5v14" />
      <path d="M17 5v14" />
    </Icon>
  );
}

export function DairyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2h8l4 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7l4-5Z" />
      <path d="M12 10v6" />
      <path d="M8 14h8" />
    </Icon>
  );
}

export function RiceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 15h16" />
      <path d="M6 15c0-4 2.5-9 6-9s6 5 6 9" />
      <path d="M8 12h8" />
      <path d="M9 9h6" />
    </Icon>
  );
}

export function SpiceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2v20" />
      <path d="M8 6c0-2 1.5-3 4-3s4 1 4 3-1.5 3-4 3" />
      <path d="M8 18c0 2 1.5 3 4 3s4-1 4-3-1.5-3-4-3" />
    </Icon>
  );
}

export function OilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 22h6" />
      <path d="M8 8h8v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8Z" />
      <path d="M12 2c-1.5 2-3 4-3 6h6c0-2-1.5-4-3-6Z" />
    </Icon>
  );
}

export function CerealIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9h12" />
      <path d="M5 9v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <path d="M8 9V7a4 4 0 0 1 8 0v2" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PersonalCareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 22h6" />
      <path d="M7 10h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10Z" />
      <path d="M12 10V5a2 2 0 0 1 4 0" />
      <path d="M9 5a2 2 0 0 1 3-2" />
    </Icon>
  );
}

export function CookingEssentialIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2v4" />
      <path d="M4 10h16" />
      <path d="M6 10c0 4 2 9 6 9s6-5 6-9" />
      <path d="M9 14h6" />
    </Icon>
  );
}

export function BreakfastIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="11" r="5" />
      <path d="M12 6v10" />
      <path d="M7 11h10" />
      <path d="M18 21H6" />
    </Icon>
  );
}

export function TeaCoffeeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 8h2a2 2 0 0 1 0 4h-2" />
      <path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
      <path d="M6 2v2" />
      <path d="M10 2v2" />
      <path d="M14 2v2" />
    </Icon>
  );
}

export function BakingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 19h16" />
      <path d="M5 19V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      <circle cx="12" cy="14" r="2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ElectronicsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="6" width="16" height="10" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 16v5" />
      <circle cx="12" cy="11" r="2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function CleaningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 22h6" />
      <path d="M7 10h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10Z" />
      <path d="M12 10V4" />
      <path d="M9 4h6" />
      <path d="M8 14h8" />
    </Icon>
  );
}

export function PestControlIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="16" rx="6" ry="4" />
      <path d="M12 12V7" />
      <path d="M8 9l-3-2" />
      <path d="M16 9l3-2" />
      <path d="M7 16H5" />
      <path d="M17 16h2" />
    </Icon>
  );
}

export function AirFreshenerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2v4" />
      <path d="M8 8h8v6a4 4 0 0 1-8 0V8Z" />
      <path d="M6 22h12" />
      <path d="M8 18c0 2 1.5 4 4 4s4-2 4-4" />
    </Icon>
  );
}

export function BabyCareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 20h8" />
      <path d="M6 10h12v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8Z" />
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v1" />
    </Icon>
  );
}

export function DefaultCategoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </Icon>
  );
}

export function getCategoryIcon(slug: string, size = 20) {
  switch (slug) {
    case 'ice-cream': return <IceCreamIcon size={size} />;
    case 'cold-beverages': return <BeverageIcon size={size} />;
    case 'chips-and-pretzels':
    case 'chips-pretzels': return <ChipsPretzelsIcon size={size} />;
    case 'snacks': return <SnackIcon size={size} />;
    case 'condiments': return <CondimentIcon size={size} />;
    case 'energy-boosters': return <EnergyIcon size={size} />;
    case 'biscuits-and-cookies': return <BiscuitIcon size={size} />;
    case 'chocolates-and-candies': return <ChocolateIcon size={size} />;
    case 'dairy-and-eggs': return <DairyIcon size={size} />;
    case 'rice-and-grain': return <RiceIcon size={size} />;
    case 'spices': return <SpiceIcon size={size} />;
    case 'oil-and-ghee': return <OilIcon size={size} />;
    case 'cereals': return <CerealIcon size={size} />;
    case 'personal-care': return <PersonalCareIcon size={size} />;
    case 'cooking-essentials': return <CookingEssentialIcon size={size} />;
    case 'breakfast': return <BreakfastIcon size={size} />;
    case 'tea-&-coffee':
    case 'tea-and-coffee': return <TeaCoffeeIcon size={size} />;
    case 'baking-needs': return <BakingIcon size={size} />;
    case 'electronics': return <ElectronicsIcon size={size} />;
    case 'cleaning-supplies': return <CleaningIcon size={size} />;
    case 'pest-control': return <PestControlIcon size={size} />;
    case 'air-freshner': return <AirFreshenerIcon size={size} />;
    case 'baby-care': return <BabyCareIcon size={size} />;
    default: return <DefaultCategoryIcon size={size} />;
  }
}
