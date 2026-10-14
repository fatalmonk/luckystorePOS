import type { Metadata } from 'next';
import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import { getSeoPost } from '@/lib/notfair-client';
import { NotFairPostHero } from 'notfair-nextjs-blog/react';
import { sanitizeNotFairArticleHtml } from '@/lib/notfair-article';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import styles from '../notfair-article.module.css';
import { JsonLd } from '../../../components/seo/JsonLd';
import { getBlogCanonicalUrl, getBlogPublicationDate } from '@/lib/blog-seo';

export const revalidate = 3600;
const getPost = cache((slug: string) => getSeoPost(slug));
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const url = getBlogCanonicalUrl(post.slug);
  return {
    title: post.title,
    description: post.meta_description ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.meta_description ?? undefined,
      type: 'article',
      url,
      images: [{ url: post.image_url, width: 1600, height: 900, alt: post.title }],
      publishedTime: getBlogPublicationDate(post.published_at),
    },
    twitter: { card: 'summary_large_image', title: post.title, images: [post.image_url] },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const url = getBlogCanonicalUrl(post.slug);
  const datePublished = getBlogPublicationDate(post.published_at);
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        image: post.image_url,
        url,
        mainEntityOfPage: url,
        ...(datePublished ? { datePublished } : {}),
      }} />
      <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }, { label: post.title, href: `/blog/${encodeURIComponent(post.slug)}` }]} />
      <NotFairPostHero
        post={post}
        className="space-y-6"
        imageClassName="rounded-warm-card"
        titleClassName="text-3xl font-black tracking-tight text-warm-fg sm:text-4xl"
        sizes="(max-width: 768px) 100vw, 768px"
      />
      <div
        className={styles.articleContent}
        dangerouslySetInnerHTML={{ __html: sanitizeNotFairArticleHtml(post.content_html) }}
      />
    </article>
  );
}
