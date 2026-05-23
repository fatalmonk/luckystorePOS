# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Warm Redesign & Design System

The admin dashboard has been redesigned with a warm, premium, Anthropic-inspired palette (cream/sand surfaces, charcoal text, and terracotta highlights).

### Core Design System Tokens (`src/theme/tokens.ts` & `src/styles/tokens.css`)
- **Colors**:
  - Warm Sand Base: `#f5f4ed` (`--warm-bg`)
  - Warm Surface/Card: `#faf9f5` (`--warm-surface`)
  - Terracotta Accent: `#c96442` (`--warm-accent` / `--warm-accent-light`)
  - Warm Charcoal Text: `#141413` (`--warm-fg`)
  - Muted Borders: `#e8e6dc` (`--warm-border-warm`)
- **Typography**:
  - Headings: Georgia display system (`font-display`)
  - Data / Monospace: JetBrains Mono (`font-mono`)

### New & Updated Components

#### 1. Collapsible Sidebar (`src/components/SidebarNew.tsx`)
- Replaces the old static sidebar layout.
- Animates between 260px (expanded) and 72px (collapsed) via a floating toggle trigger.
- Integrates a store/branch switcher and responsive menu options.
- Integrates the user profile avatar and metadata footer.

#### 2. KPI Header Cards (`src/features/dashboard/HeaderStats.tsx`)
- Provides 4 key metrics (Revenue, Sales, Customers, Profit) utilizing warm card styling.
- Trend indicators adapt to the warm semantic theme (warm-success, warm-danger, warm-accent).

#### 3. Recent Activity Feed (`src/features/dashboard/RecentActivity.tsx`)
- Renders an interactive feed list with custom icons and date formatting via `date-fns`.
- Utilizes warm-accent indicator flags.

#### 4. UI Library Enhancements (`src/components/ui/`)
- **`Button.tsx`**: Updated with primary (terracotta), secondary (warm-surface), and ghost variants.
- **`Card.tsx`**: Implements `rounded-xl`, warm shadow levels, and warm background and border.
- **`Modal.tsx` & `Drawer.tsx`**: Apply custom frosted glass background overlay (`bg-warm-deep/40 backdrop-blur-sm`) and modern responsive layout dimensions.

