import nextConfig from 'eslint-config-next';
import reactHooks from 'eslint-plugin-react-hooks';

const eslintConfig = [
  ...nextConfig,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Preserve the existing lint contract; this newer compiler rule flags
      // established state hydration effects across the app.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: ['.next/**', '.next-turbo/**', '.next-webpack/**', 'node_modules/**', 'dist/**'],
  },
];

export default eslintConfig;
