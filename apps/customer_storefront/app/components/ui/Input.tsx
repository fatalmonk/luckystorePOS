'use client'; // controlled input/textarea with focus ring transitions and optional search handler

import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[13px] font-bold mb-1.5 text-[#1c1917]">
          {label}
        </label>
      )}
      <input
        className={`
          w-full h-12 px-4
          border border-[#e7e5e4] rounded-[14px]
          bg-white text-[#1c1917] text-base
          outline-none
          focus:border-[#ffe302] focus:shadow-[0_0_0_3px_rgba(255,243,77,0.15)]
          transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          placeholder:text-[#a8a29e]
          ${className}
        `}
        {...props}
      />
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className = '', ...props }: TextAreaProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[13px] font-bold mb-1.5 text-[#1c1917]">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full min-h-[80px] p-3 px-4 resize-y
          border border-[#e7e5e4] rounded-[14px]
          bg-white text-[#1c1917] text-base
          outline-none
          focus:border-[#ffe302] focus:shadow-[0_0_0_3px_rgba(255,243,77,0.15)]
          transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          placeholder:text-[#a8a29e]
          ${className}
        `}
        {...props}
      />
    </div>
  );
}

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (term: string) => void;
}

export function SearchInput({ onSearch, ...props }: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e] text-sm">
        ⌕
      </span>
      <input
        type="text"
        placeholder="Search milk, rice, eggs…"
        className="
          w-full h-[38px] pl-9 pr-4
          bg-[#faf8f5] border border-[#e7e5e4] rounded-full
          text-sm text-[#1c1917]
          outline-none
          focus:border-[#ffe302] focus:bg-white focus:shadow-[0_0_0_3px_rgba(220,95,59,0.07)]
          transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          placeholder:text-[#a8a29e]
        "
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch?.(e.currentTarget.value);
          }
        }}
        {...props}
      />
    </div>
  );
}
