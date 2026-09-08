'use client';

import React, { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { DELIVERY_FAQS, type DeliveryFaqItem } from './deliveryData';

export { DELIVERY_FAQS, type DeliveryFaqItem };

export function DeliveryFaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="divide-y divide-warm-border rounded-2xl border border-warm-border bg-warm-surface overflow-hidden">
      {DELIVERY_FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        const buttonId = `faq-btn-${index}`;
        const panelId = `faq-panel-${index}`;

        return (
          <div key={index} className="transition-colors">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left font-bold text-warm-fg transition-colors hover:bg-warm-image-well/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                <span className="text-base sm:text-lg">{faq.question}</span>
                <span
                  className={`shrink-0 text-warm-muted transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-warm-fg' : ''
                  }`}
                  aria-hidden="true"
                >
                  <CaretDown size={20} weight="bold" />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className={`px-5 pb-5 pt-1 text-sm sm:text-base leading-relaxed text-warm-muted ${
                isOpen ? 'block' : 'hidden'
              }`}
            >
              <p>{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
