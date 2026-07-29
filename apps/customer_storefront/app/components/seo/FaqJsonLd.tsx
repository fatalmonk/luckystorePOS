export function FaqJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does Lucky Store provide same-day grocery delivery in Chittagong?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Lucky Store provides same-day grocery delivery across Chittagong for orders placed before 6:00 PM. Delivery is free for orders over ৳500.',
        },
      },
      {
        '@type': 'Question',
        name: 'What payment options does Lucky Store accept?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Lucky Store accepts Cash on Delivery (COD), bKash, Nagad, and Credit/Debit cards (Visa and Mastercard).',
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
