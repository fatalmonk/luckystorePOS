import { z } from 'zod';
import { Resolver, FieldValues } from 'react-hook-form';

export const zodResolver = <T extends z.ZodTypeAny>(
  schema: T
): Resolver<z.infer<T> & FieldValues> => {
  return (async (values: FieldValues) => {
    try {
      const data = await schema.parseAsync(values);
      return {
        values: data,
        errors: {},
      };
    } catch (e) {
      if (e instanceof z.ZodError) {
        const errors = e.issues.reduce(
          (acc: Record<string, any>, currentError: any) => {
            const key = currentError.path.join('.');
            // only keep the first error per path
            if (!acc[key]) {
              acc[key] = {
                type: currentError.code,
                message: currentError.message,
              };
            }
            return acc;
          },
          {}
        );
        return {
          values: {},
          errors,
        };
      }
      throw e;
    }
  }) as any;
};
