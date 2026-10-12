import type { Metadata } from 'next';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getSeoPosts } from 'notfair-nextjs-blog';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read the latest articles from Lucky Store.',
  alternates: { canonical: 'https://www.luckystore1947.com/blog' },
};

export default async function BlogIndex() {
  const posts = await getSeoPosts();
  return (
    <>
      <h1 className="text-3xl font-black tracking-tight text-warm-fg sm:text-4xl">Blog</h1>
      <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }]} />
      {posts.length === 0 ? (
        <p className="text-warm-muted">No articles have been published yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.slug} className="overflow-hidden rounded-warm-card border border-warm-border bg-warm-surface">
              <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="block space-y-4 pb-5">
                <Image
                  src={post.image_url}
                  alt={post.title}
                  width={1600}
                  height={900}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="aspect-video w-full object-cover"
                />
                <div className="space-y-2 px-5">
                  <h2 className="text-xl font-bold text-warm-fg">{post.title}</h2>
                  {post.meta_description && <p className="text-sm text-warm-muted">{post.meta_description}</p>}
                  {post.reading_time_minutes != null && <p className="text-xs text-warm-muted">{post.reading_time_minutes} min read</p>}
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
