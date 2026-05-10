/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--color-background-default)',
          subtle: 'var(--color-background-subtle)',
        },
        surface: {
          DEFAULT: 'var(--color-surface-default)',
          raised: 'var(--color-surface-raised)',
          overlay: 'var(--color-surface-overlay)',
        },
        primary: {
          DEFAULT: 'var(--color-primary-default)',
          hover: 'var(--color-primary-hover)',
          pressed: 'var(--color-primary-pressed)',
          subtle: 'var(--color-primary-subtle)',
          on: 'var(--color-primary-on)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary-default)',
          hover: 'var(--color-secondary-hover)',
          subtle: 'var(--color-secondary-subtle)',
          on: 'var(--color-secondary-on)',
        },
        success: {
          DEFAULT: 'var(--color-success-default)',
          dark: 'var(--color-success-dark)',
          subtle: 'var(--color-success-subtle)',
          on: 'var(--color-success-on)',
        },
        danger: {
          DEFAULT: 'var(--color-danger-default)',
          dark: 'var(--color-danger-dark)',
          subtle: 'var(--color-danger-subtle)',
          on: 'var(--color-danger-on)',
        },
        warning: {
          DEFAULT: 'var(--color-warning-default)',
          dark: 'var(--color-warning-dark)',
          subtle: 'var(--color-warning-subtle)',
          on: 'var(--color-warning-on)',
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
          link: 'var(--color-text-link)',
        },
      },
      fontFamily: {
        primary: 'var(--font-family-primary)',
        mono: 'var(--font-family-mono)',
      },
      boxShadow: {
        'level-1': 'var(--elevation-1)',
        'level-2': 'var(--elevation-2)',
        'level-3': 'var(--elevation-3)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
      },
      borderRadius: {
        'none': 'var(--radius-none)',
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'full': 'var(--radius-full)',
      }
    },
  },
  plugins: [],
}
