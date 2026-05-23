// Design Tokens: Anthropic-inspired Warm Palette
// Source: @_plans/redesign/luckystorepos-admin.html

export const tokens = {
  colors: {
    // Backgrounds
    bg: '#f5f4ed',
    surface: '#faf9f5',
    
    // Text
    fg: '#141413',
    muted: '#5e5d59',
    dim: '#87867f',
    
    // Borders
    border: '#f0eee6',
    'border-warm': '#e8e6dc',
    
    // Accent / Primary (Terracotta)
    accent: '#c96442',
    'accent-light': '#d97757',
    
    // Semantic
    success: '#4a7c59',
    warning: '#c9a227',
    danger: '#b53333',
    
    // Depth
    sand: '#e8e6dc',
    charcoal: '#4d4c48',
    dark: '#30302e',
    deep: '#141413',
    silver: '#b0aea5',
    ring: '#d1cfc5',
  },
  
  fonts: {
    display: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  },
  
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
  },
  
  spacing: {
    sidebar: {
      expanded: '260px',
      collapsed: '72px',
    },
    header: '64px',
  },
  
  transitions: {
    default: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Tailwind-compatible color exports
export const warmColors = {
  bg: tokens.colors.bg,
  surface: tokens.colors.surface,
  fg: tokens.colors.fg,
  muted: tokens.colors.muted,
  dim: tokens.colors.dim,
  border: tokens.colors.border,
  'border-warm': tokens.colors['border-warm'],
  accent: tokens.colors.accent,
  'accent-light': tokens.colors['accent-light'],
  success: tokens.colors.success,
  warning: tokens.colors.warning,
  danger: tokens.colors.danger,
  sand: tokens.colors.sand,
  charcoal: tokens.colors.charcoal,
  dark: tokens.colors.dark,
  deep: tokens.colors.deep,
  silver: tokens.colors.silver,
  ring: tokens.colors.ring,
};

// CSS variable generator for runtime usage
export function generateCSSVariables(): string {
  return `
:root {
  --warm-bg: ${tokens.colors.bg};
  --warm-surface: ${tokens.colors.surface};
  --warm-fg: ${tokens.colors.fg};
  --warm-muted: ${tokens.colors.muted};
  --warm-dim: ${tokens.colors.dim};
  --warm-border: ${tokens.colors.border};
  --warm-border-warm: ${tokens.colors['border-warm']};
  --warm-accent: ${tokens.colors.accent};
  --warm-accent-light: ${tokens.colors['accent-light']};
  --warm-success: ${tokens.colors.success};
  --warm-warning: ${tokens.colors.warning};
  --warm-danger: ${tokens.colors.danger};
  --warm-sand: ${tokens.colors.sand};
  --warm-charcoal: ${tokens.colors.charcoal};
  --warm-dark: ${tokens.colors.dark};
  --warm-deep: ${tokens.colors.deep};
  --warm-silver: ${tokens.colors.silver};
  --warm-ring: ${tokens.colors.ring};
  
  --font-display: ${tokens.fonts.display};
  --font-body: ${tokens.fonts.body};
  --font-mono: ${tokens.fonts.mono};
  
  --radius-sm: ${tokens.radius.sm};
  --radius-md: ${tokens.radius.md};
  --radius-lg: ${tokens.radius.lg};
  --radius-xl: ${tokens.radius.xl};
  --radius-2xl: ${tokens.radius['2xl']};
  
  --sidebar-expanded: ${tokens.spacing.sidebar.expanded};
  --sidebar-collapsed: ${tokens.spacing.sidebar.collapsed};
  --header-height: ${tokens.spacing.header};
  
  --transition-default: ${tokens.transitions.default};
}
  `.trim();
}
