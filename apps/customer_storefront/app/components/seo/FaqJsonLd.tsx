import React from 'react';

export function FaqJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How far does Lucky Store deliver?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Delivery is available within the verified 1 km Chawkbazar delivery radius. Add your address at checkout and include a nearby landmark so the team can confirm coverage.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to pay online first?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No prepayment is required. You can pay by Cash on Delivery or bKash when the delivery partner reaches your doorstep.',
        },
      },
      {
        '@type': 'Question',
        name: 'What if something is missing or damaged?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Inspect the order when it arrives. If an item is missing, damaged, or not acceptable, hand it back immediately and contact the store team for support.',
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
