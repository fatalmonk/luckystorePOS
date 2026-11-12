'use client';

import * as React from 'react';

import { cn } from 'cn';

type LiquidButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
  delay?: string;
  fillHeight?: string;
  hoverScale?: number;
  tapScale?: number;
};

function LiquidButton(props: LiquidButtonProps) {
  const {
    delay = '0.3s',
    fillHeight = '3px',
    hoverScale = 1,
    tapScale = 0.97,
    asChild = false,
    style,
    className,
    children,
    ...restProps
  } = props;
  const liquidClassName = cn(
    'liquid-button overflow-hidden',
    !asChild &&
      'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap text-primary outline-none [--liquid-button-background-color:var(--muted)] [--liquid-button-color:var(--primary)] hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
    className,
  );
  const liquidStyle = {
    '--liquid-button-rest-height': fillHeight,
    '--liquid-button-configured-delay': delay,
    '--liquid-button-hover-scale': String(hoverScale),
    '--liquid-button-tap-scale': String(tapScale),
    backgroundImage: 'linear-gradient(var(--liquid-button-color, transparent) 0 0)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'calc(200% - var(--liquid-button-fill-width, -1%)) 100%',
    backgroundSize: '200% var(--liquid-button-fill-height, 0.2em)',
    ...(asChild ? {} : { backgroundColor: 'var(--liquid-button-background-color)' }),
    transition: `background-size ${delay} var(--liquid-button-delay), color ${delay} ${delay}, background-position ${delay} calc(${delay} - var(--liquid-button-delay)), transform 180ms cubic-bezier(.2,.8,.2,1)`,
    ...style,
  } as React.CSSProperties;

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{
      className?: string;
      style?: React.CSSProperties;
    }>;
    return React.cloneElement(child, {
      ...restProps,
      'data-slot': 'liquid-button',
      className: cn(child.props.className, liquidClassName),
      style: { ...child.props.style, ...liquidStyle },
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      data-slot="liquid-button"
      className={liquidClassName}
      style={liquidStyle}
      {...restProps}
    >
      {children}
    </button>
  );
}

export { LiquidButton, type LiquidButtonProps };
