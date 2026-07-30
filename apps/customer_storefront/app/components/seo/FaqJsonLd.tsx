import React from 'react';

export function FaqJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does Lucky Store deliver groceries in Chittagong?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Lucky Store offers local grocery delivery across Chittagong. Add groceries to your cart and review the delivery details before placing your order.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I pay when my grocery order arrives?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Lucky Store accepts cash on delivery, so you can pay when your grocery order arrives.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where is Lucky Store located in Chittagong?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Lucky Store is located at 665 Percival Hill Road, Emdad Park, Chittagong 4203, Bangladesh. Serving the neighborhood since 1947.',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
