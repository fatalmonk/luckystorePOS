import React from 'react';
import { Metadata } from 'next';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: any;
  hrefLang?: { en: string; bn: string; };
  image?: string;
  robots?: string;
}

export const SEOHead = ({ title, description, canonical, jsonLd, hrefLang, image, robots }: SEOHeadProps) => {
  const baseUrl = 'https://www.luckystore1947.com';
  const canonicalUrl = canonical || `${baseUrl}${window.location.pathname}`;

  // Open Graph
  const og = {
    title,
    description,
    url: canonicalUrl,
    siteName: 'Lucky Store',
    locale: 'en_BD',
    type: 'website',
    images: image ? [{ url: image, alt: title }] : [],
  };

  // Twitter
  const twitter = {
    card: 'summary_large_image',
    title,
    description,
    images: image ? [image] : [],
  };

  // Hreflang links
  const hrefLangTags = hrefLang ? (
    <>
      <link rel="alternate" hrefLang="en" href={hrefLang.en} />
      <link rel="alternate" hrefLang="bn" href={hrefLang.bn} />
      <link rel="alternate" hrefLang="x-default" href={hrefLang.en} />
    </>
  ) : null;

  // JSON-LD structured data
  const jsonLdScript = jsonLd ? (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  ) : null;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {hrefLangTags}
      {/* Open Graph */}
      <meta property="og:title" content={og.title} />
      <meta property="og:description" content={og.description} />
      <meta property="og:url" content={og.url} />
      <meta property="og:site_name" content={og.siteName} />
      <meta property="og:locale" content={og.locale} />
      <meta property="og:type" content={og.type} />
      {og.images.map((img, i) => (
        <React.Fragment key={i}>
          <meta property="og:image" content={img.url} />
          <meta property="og:image:alt" content={img.alt} />
        </React.Fragment>
      ))}
      {/* Twitter */}
      <meta name="twitter:card" content={twitter.card} />
      <meta name="twitter:title" content={twitter.title} />
      <meta name="twitter:description" content={twitter.description} />
      {twitter.images.map((img, i) => (
        <meta key={i} name="twitter:image" content={img} />
      ))}
      {/* Robots */}
      {robots && <meta name="robots" content={robots} />}
      {jsonLdScript}
    </>
  );
};

export default SEOHead;