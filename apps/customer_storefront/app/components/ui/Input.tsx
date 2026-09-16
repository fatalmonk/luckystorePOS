'use client'; // controlled input/textarea with focus ring transitions and optional search handler

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, className = '', ...props }, ref) => {
  const generatedId = useId();
  const inputId = props.id ?? `input-${generatedId}`;
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-bold mb-1.5 text-warm-fg">
          {label}
        </label>
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
          transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          placeholder:text-warm-muted
          ${className}
        `}
        {...props}
      />
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
        <label htmlFor={textareaId} className="block text-[13px] font-bold mb-1.5 text-warm-fg">
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
          transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          placeholder:text-warm-muted
          ${className}
        `}
        {...props}
      />
    </div>
  );
});
TextArea.displayName = 'TextArea';
