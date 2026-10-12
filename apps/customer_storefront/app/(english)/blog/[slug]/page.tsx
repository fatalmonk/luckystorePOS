import type { Metadata } from 'next';
import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import { getSeoPost } from 'notfair-nextjs-blog';
import { NotFairPostHero } from 'notfair-nextjs-blog/react';
import { sanitizeNotFairArticleHtml } from '@/lib/notfair-article';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import styles from '../notfair-article.module.css';

export const revalidate = 3600;
const getPost = cache((slug: string) => getSeoPost(slug));
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const url = `https://www.luckystore1947.com/blog/${encodeURIComponent(post.slug)}`;
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
      publishedTime: post.published_at ?? undefined,
    },
    twitter: { card: 'summary_large_image', title: post.title, images: [post.image_url] },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return (
    <article className="mx-auto max-w-3xl space-y-8">
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
