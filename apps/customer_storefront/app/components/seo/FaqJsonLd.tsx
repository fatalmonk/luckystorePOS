import React from 'react';

export function FaqJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does Lucky Store offer home delivery for online grocery in Chittagong?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Lucky Store provides fast online grocery home delivery across Chittagong, including free home delivery options on eligible staple orders. You can order fresh food, pantry essentials, and household goods online.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where can I find an organic grocery shop near me in Chittagong?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Lucky Store offers fresh organic grocery items, organic food, and daily essentials online at luckystore1947.com with direct home delivery to your doorstep in Chittagong.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I get discount groceries and pay cash on delivery?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Lucky Store features daily discount grocery items on pantry staples, rice, oil, and fresh food with Cash on Delivery (COD) accepted at your door.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where is Lucky Store located in Chittagong?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Lucky Store is located at 665 Percival Hill Road, Emdad Park, Chittagong 4203, Bangladesh. Serving Chittagong as a trusted neighborhood grocery store since 1947.',
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
