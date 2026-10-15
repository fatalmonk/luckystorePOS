import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Tests intentionally execute Server Components in Node/jsdom. Keep the production
// server-only boundary enforced by Next.js while allowing server modules in tests.
vi.mock('server-only', () => ({}));
