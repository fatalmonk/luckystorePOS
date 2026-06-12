import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { clsx } from 'clsx';

export type EditableType = 'text' | 'number' | 'currency' | 'date';

interface EditableCellProps {
  value: string | number | undefined;
  type?: EditableType;
  onSave: (value: string | number) => Promise<void> | void;
  onCancel?: () => void;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  formatter?: (value: string | number) => string;
  parser?: (value: string) => string | number;
  validate?: (value: string | number) => string | null;
  onChange?: (value: string | number) => void;
  /** CSS class for the input in edit mode */
  inputClassName?: string;
  /** Show green flash animation on successful save */
  flashOnSave?: boolean;
  /** Auto focus the input when entering edit mode */
  autoFocus?: boolean;
}

export function EditableCell({
  value,
  type = 'text',
  onSave,
  onCancel,
  onChange,
  className,
  placeholder = '—',
  min,
  max,
  step,
  disabled = false,
  formatter,
  parser,
  validate,
  inputClassName,
  flashOnSave = true,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger onChange when editValue changes
  useEffect(() => {
    if (isEditing && onChange) {
      onChange(parseValue(editValue));
    }
  }, [editValue, isEditing, onChange]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle click outside to cancel
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, editValue]);

  const getInputType = (): string => {
    switch (type) {
      case 'number':
      case 'currency':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  };

  const formatValue = (val: string | number | undefined): string => {
    if (val === undefined || val === null || val === '') return placeholder;
    if (formatter) return formatter(val);
    return String(val);
  };

  const parseValue = (val: string): string | number => {
    if (parser) return parser(val);
    if (type === 'number' || type === 'currency') {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    }
    return val;
  };

  const handleStartEdit = () => {
    if (disabled) return;
    setEditValue(String(value ?? ''));
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (isSaving) return;

    const parsedValue = parseValue(editValue);
    
    // Validation
    if (validate) {
      const validationError = validate(parsedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Skip if value hasn't changed (loose equality for number/string comparison)
    const valueChanged = (() => {
      if (parsedValue === value) return false;
      // Handle number vs string comparison (e.g., 100 vs "100")
      if (typeof parsedValue === 'number' && typeof value === 'string') {
        return parsedValue !== Number(value);
      }
      if (typeof parsedValue === 'string' && typeof value === 'number') {
        return Number(parsedValue) !== value;
      }
      // Handle empty/null/undefined equality
      if (parsedValue === '' && (value === undefined || value === null)) return false;
      return true;
    })();
    
    if (!valueChanged) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(parsedValue);
      setIsEditing(false);
      if (flashOnSave) {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      // Revert edit value to original
      setEditValue(String(value ?? ''));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(value ?? ''));
    setError(null);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Dispatch custom event for parent to handle tab navigation
      const event = new CustomEvent('editablecell:tab', {
        detail: { direction: e.shiftKey ? 'backward' : 'forward' },
        bubbles: true,
      });
      containerRef.current?.dispatchEvent(event);
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Display mode
  if (!isEditing) {
    return (
      <div
        ref={containerRef}
        onClick={handleStartEdit}
        className={clsx(
          'cursor-pointer select-none rounded px-2 py-1 transition-colors',
          'hover:bg-surface-hover focus:outline-none focus:ring-1 focus:ring-primary',
          disabled && 'cursor-not-allowed opacity-50',
          showFlash && 'animate-flash-success',
          className
        )}
        title="Click to edit"
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleStartEdit();
          }
        }}
      >
        <span className={clsx('tabular-nums', type === 'currency' && 'font-mono')}>
          {formatValue(value)}
        </span>
      </div>
    );
  }

  // Edit mode
  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type={getInputType()}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        min={min}
        max={max}
        step={step}
        className={clsx(
          'w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2',
          error
            ? 'border-danger focus:border-danger focus:ring-danger/30'
            : 'border-primary focus:border-primary focus:ring-primary/30',
          type === 'currency' && 'font-mono',
          inputClassName
        )}
      />
      {error && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded bg-danger px-2 py-1 text-xs text-white shadow-lg">
          {error}
        </div>
      )}
      {isSaving && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}

// Flash success animation styles (add to global CSS if not present)
// @keyframes flash-success {
//   0% { background-color: rgba(34, 197, 94, 0.3); }
//   100% { background-color: transparent; }
// }
// .animate-flash-success {
//   animation: flash-success 0.5s ease-out;
// }
