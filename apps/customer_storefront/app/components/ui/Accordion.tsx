'use client';

import React, {
  createContext,
  useContext,
  useState,
  useId,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import { CaretDown } from '@phosphor-icons/react';

interface AccordionContextType {
  openValues: Set<string>;
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

interface AccordionItemContextType {
  value: string;
  isOpen: boolean;
  triggerId: string;
  panelId: string;
}

const AccordionItemContext = createContext<AccordionItemContextType | null>(null);

/* -------------------------------------------------------------------------- */
/*                                Accordion                                   */
/* -------------------------------------------------------------------------- */

export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: string | string[];
  multiple?: boolean;
  children: ReactNode;
  className?: string;
}

export function Accordion({
  defaultValue,
  multiple = false,
  children,
  className = '',
  ...props
}: AccordionProps) {
  const [openValues, setOpenValues] = useState<Set<string>>(() => {
    if (defaultValue == null) return new Set();
    if (Array.isArray(defaultValue)) return new Set(defaultValue);
    return new Set([defaultValue]);
  });

  const toggle = (value: string) => {
    setOpenValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (!multiple) {
          next.clear();
        }
        next.add(value);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ openValues, toggle }}>
      <div
        className={`divide-y divide-warm-border rounded-2xl border border-warm-border bg-warm-surface overflow-hidden ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                              AccordionItem                                 */
/* -------------------------------------------------------------------------- */

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
  className?: string;
}

export function AccordionItem({
  value,
  children,
  className = '',
  ...props
}: AccordionItemProps) {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('AccordionItem must be used within an Accordion');
  }

  const generatedId = useId();
  const triggerId = `accordion-trigger-${generatedId}`;
  const panelId = `accordion-panel-${generatedId}`;
  const isOpen = context.openValues.has(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen, triggerId, panelId }}>
      <div className={`transition-colors ${className}`.trim()} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                            AccordionTrigger                                */
/* -------------------------------------------------------------------------- */

export interface AccordionTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
}

export function AccordionTrigger({
  children,
  className = '',
  onClick,
  ...props
}: AccordionTriggerProps) {
  const accordion = useContext(AccordionContext);
  const item = useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error('AccordionTrigger must be used within an AccordionItem');
  }

  return (
    <h3>
      <button
        type="button"
        id={item.triggerId}
        aria-expanded={item.isOpen}
        aria-controls={item.panelId}
        onClick={(e) => {
          accordion.toggle(item.value);
          onClick?.(e);
        }}
        className={`flex w-full items-center justify-between gap-4 p-5 text-left font-bold text-warm-fg transition-colors hover:bg-warm-image-well/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${className}`.trim()}
        {...props}
      >
        <span className="text-base sm:text-lg">{children}</span>
        <span
          className={`shrink-0 text-warm-muted transition-transform duration-200 ${
            item.isOpen ? 'rotate-180 text-warm-fg' : ''
          }`}
          aria-hidden="true"
        >
          <CaretDown size={20} weight="bold" />
        </span>
      </button>
    </h3>
  );
}

/* -------------------------------------------------------------------------- */
/*                            AccordionContent                                */
/* -------------------------------------------------------------------------- */

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function AccordionContent({
  children,
  className = '',
  ...props
}: AccordionContentProps) {
  const item = useContext(AccordionItemContext);

  if (!item) {
    throw new Error('AccordionContent must be used within an AccordionItem');
  }

  return (
    <div
      id={item.panelId}
      role="region"
      aria-labelledby={item.triggerId}
      hidden={!item.isOpen}
      className={`px-5 pb-5 pt-1 text-sm sm:text-base leading-relaxed text-warm-muted ${
        item.isOpen ? 'block' : 'hidden'
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
