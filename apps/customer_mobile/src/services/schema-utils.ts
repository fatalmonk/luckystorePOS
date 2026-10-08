import { z } from 'zod';

/**
 * Standardized category schema normalizing whitespace and empty strings to 'General'.
 */
export const CategoryNameSchema = z.string().transform((val) => val.trim() || 'General');
