import React from 'react';
import { UseFormReturn, FormProvider, useFormContext, Controller, RegisterOptions } from 'react-hook-form';
import { clsx } from 'clsx';

interface FormProps<TFieldValues extends Record<string, any> = Record<string, any>> 
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<TFieldValues, any, any>;
  onSubmit: (values: TFieldValues) => void | Promise<void>;
  className?: string;
}

export function Form<TFieldValues extends Record<string, any>>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className={clsx("space-y-6", className)}
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  );
}

interface FormFieldProps {
  name: string;
  label?: string;
  description?: string;
  className?: string;
  rules?: RegisterOptions;
  render: (props: { field: any, fieldState: any, formState: any }) => React.ReactNode;
}

export function FormField({
  name,
  label,
  description,
  className,
  rules,
  render
}: FormFieldProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState, formState }) => (
        <div className={clsx("flex flex-col gap-1.5", className)}>
          {label && (
            <label className="text-sm font-medium text-text-secondary" htmlFor={name}>
              {label} {rules?.required && <span className="text-danger">*</span>}
            </label>
          )}
          {render({ field, fieldState, formState })}
          {description && !fieldState.error && (
            <p className="text-xs text-text-muted">{description}</p>
          )}
          {fieldState.error && (
            <p className="text-xs font-medium text-danger animate-in fade-in slide-in-from-top-1">
              {fieldState.error.message?.toString()}
            </p>
          )}
        </div>
      )}
    />
  );
}

export function FormSection({ title, description, children, className }: any) {
  return (
    <div className={clsx("flex flex-col gap-4 border-b border-border-default pb-6 mb-6 last:border-0 last:pb-0 last:mb-0", className)}>
      {(title || description) && (
        <div className="mb-2">
          {title && <h3 className="text-lg font-semibold text-text-primary">{title}</h3>}
          {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
        </div>
      )}
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

export function FormActions({ children, className }: any) {
  return (
    <div className={clsx("flex items-center justify-end gap-3 pt-4 mt-6 border-t border-border-default", className)}>
      {children}
    </div>
  );
}
