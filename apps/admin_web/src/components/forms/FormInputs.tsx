import React, { forwardRef } from 'react';
import { FormField } from './FormCore';
import { clsx } from 'clsx';
import { RegisterOptions } from 'react-hook-form';

interface BaseFormInputProps {
  name: string;
  label?: string;
  description?: string;
  rules?: RegisterOptions;
  className?: string;
}

export interface FormInputProps extends BaseFormInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ name, label, description, rules, className, ...props }, ref) => {
    return (
      <FormField
        name={name}
        label={label}
        description={description}
        className={className}
        rules={rules}
        render={({ field, fieldState }) => (
          <input
            {...field}
            {...props}
            ref={(e) => {
              field.ref(e);
              if (typeof ref === 'function') ref(e);
              else if (ref) ref.current = e;
            }}
            id={name}
            className={clsx(
              "input w-full",
              fieldState.error && "border-danger focus:ring-danger/20",
              props.disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          />
        )}
      />
    );
  }
);
FormInput.displayName = 'FormInput';

export interface FormTextareaProps extends BaseFormInputProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ name, label, description, rules, className, ...props }, ref) => {
    return (
      <FormField
        name={name}
        label={label}
        description={description}
        className={className}
        rules={rules}
        render={({ field, fieldState }) => (
          <textarea
            {...field}
            {...props}
            ref={(e) => {
              field.ref(e);
              if (typeof ref === 'function') ref(e);
              else if (ref) ref.current = e;
            }}
            id={name}
            className={clsx(
              "input w-full min-h-[100px] resize-y",
              fieldState.error && "border-danger focus:ring-danger/20",
              props.disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          />
        )}
      />
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

export interface FormSelectProps extends BaseFormInputProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  options: { label: string; value: string | number }[];
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ name, label, description, rules, className, options, ...props }, ref) => {
    return (
      <FormField
        name={name}
        label={label}
        description={description}
        className={className}
        rules={rules}
        render={({ field, fieldState }) => (
          <select
            {...field}
            {...props}
            ref={(e) => {
              field.ref(e);
              if (typeof ref === 'function') ref(e);
              else if (ref) ref.current = e;
            }}
            id={name}
            className={clsx(
              "input w-full bg-surface",
              fieldState.error && "border-danger focus:ring-danger/20",
              props.disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            <option value="" disabled>Select an option</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      />
    );
  }
);
FormSelect.displayName = 'FormSelect';

export interface FormCheckboxProps extends BaseFormInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ name, label, description, rules, className, ...props }, ref) => {
    return (
      <FormField
        name={name}
        className={className}
        rules={rules}
        render={({ field, fieldState }) => (
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              {...field}
              {...props}
              checked={!!field.value}
              ref={(e) => {
                field.ref(e);
                if (typeof ref === 'function') ref(e);
                else if (ref) ref.current = e;
              }}
              id={name}
              className={clsx(
                "checkbox mt-0.5",
                fieldState.error && "border-danger",
                props.disabled && "opacity-50 cursor-not-allowed",
                className
              )}
            />
            <div className="flex flex-col">
              {label && <label htmlFor={name} className="text-sm font-medium text-text-primary cursor-pointer">{label}</label>}
              {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
            </div>
          </div>
        )}
      />
    );
  }
);
FormCheckbox.displayName = 'FormCheckbox';
