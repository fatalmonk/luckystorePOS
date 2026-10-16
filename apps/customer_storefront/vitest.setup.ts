import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';

expect.extend(matchers);

// Tests intentionally execute Server Components in Node/jsdom. Keep the production
// server-only boundary enforced by Next.js while allowing server modules in tests.
vi.mock('server-only', () => ({}));
