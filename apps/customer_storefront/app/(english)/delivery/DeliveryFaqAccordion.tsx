'use client';

import React from 'react';
import { DELIVERY_FAQS, type DeliveryFaqItem } from '../../lib/deliveryData';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../components/ui/Accordion';

export { DELIVERY_FAQS, type DeliveryFaqItem };

export function DeliveryFaqAccordion() {
  return (
    <Accordion defaultValue="faq-0">
      {DELIVERY_FAQS.map((faq, index) => (
        <AccordionItem key={index} value={`faq-${index}`}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>
            <p>{faq.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
