'use client'; // controlled input/textarea with focus ring transitions and optional search handler

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, className = '', leadingIcon, ...props }, ref) => {
  const generatedId = useId();
  const inputId = props.id ?? `input-${generatedId}`;
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={inputId} className="block text-body-sm font-bold mb-1.5 text-warm-fg">
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-warm-muted">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-12 px-4
            border border-warm-border rounded-[14px]
            bg-warm-surface text-warm-fg text-base
            outline-none
            focus:border-warm-accent focus:shadow-[0_0_0_3px_rgba(240,196,68,0.2)]
            transition-[border-color,box-shadow] duration-150 ease-out
            placeholder:text-warm-muted
            ${className}
          `}
          {...props}
        />
      </div>
    </div>
  );
});
Input.displayName = 'Input';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ label, className = '', ...props }, ref) => {
  const generatedId = useId();
  const textareaId = props.id ?? `textarea-${generatedId}`;
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={textareaId} className="block text-body-sm font-bold mb-1.5 text-warm-fg">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={`
          w-full min-h-[80px] p-3 px-4 resize-y
          border border-warm-border rounded-[14px]
          bg-warm-surface text-warm-fg text-base
          outline-none
          focus:border-warm-accent focus:shadow-[0_0_0_3px_rgba(240,196,68,0.2)]
          transition-[border-color,box-shadow] duration-150 ease-out
          placeholder:text-warm-muted
          ${className}
        `}
        {...props}
      />
    </div>
  );
});
TextArea.displayName = 'TextArea';
