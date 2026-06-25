/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: 'var(--color-paper)',
          surface: 'var(--color-surface)',
          fg: 'var(--color-foreground)',
          muted: 'var(--color-muted)',
          dim: 'var(--color-dim)',
          border: 'var(--color-border)',
          'border-light': 'var(--color-border-light)',
          accent: 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          'accent-ghost': 'var(--color-accent-ghost)',
          'accent-text': 'var(--color-accent-text)',
          'accent-muted': 'var(--color-accent-muted)',
          'accent-dark': 'var(--color-accent-dark)',
          success: 'var(--color-success)',
          'success-bg': 'var(--color-success-bg)',
          warning: 'var(--color-warning)',
          'warning-bg': 'var(--color-warning-bg)',
          danger: 'var(--color-danger)',
          'danger-bg': 'var(--color-danger-bg)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        'warm-sm': 'var(--radius-sm)',
        'warm-md': 'var(--radius-md)',
        'warm-lg': 'var(--radius-lg)',
        'warm-xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'warm-sm': 'var(--shadow-sm)',
        'warm-md': 'var(--shadow-md)',
        'warm-lg': 'var(--shadow-lg)',
        'warm-rest': 'var(--shadow-warm-rest)',
        'warm-hover': 'var(--shadow-warm-hover)',
      },
    },
  },
  plugins: [],
};
