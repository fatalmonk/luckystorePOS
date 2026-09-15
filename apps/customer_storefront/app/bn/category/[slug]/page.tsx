import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '../../../components/updated/Header';
import { Footer } from '../../../components/updated/Footer';
import { BottomNav } from '../../../components/BottomNav';
import { GridProductCard } from '../../../components/GridProductCard';
import { createProductRepository } from '../../../lib/products/index';
import { supabase } from '../../../lib/supabase';

const CATEGORY_COPY: Record<string, { title: string; description: string; query: string }> = {
  'rice-and-grain': { title: 'চাল ও শস্য', description: 'মিনিকেট, নাজিরশাইল ও চিনিগুঁড়া চালের বর্তমান পণ্য দেখুন।', query: 'rice' },
  'oil-and-ghee': { title: 'তেল ও ঘি', description: 'সয়াবিন তেল, সরিষার তেল ও ঘি অনলাইনে দেখুন।', query: 'oil' },
  'cooking-essentials': { title: 'রান্নার প্রয়োজনীয় পণ্য', description: 'ডাল, মসলা, আটা, ময়দা, লবণ ও চিনি দেখুন।', query: 'cooking' },
  'tea-and-coffee': { title: 'চা ও কফি', description: 'ইস্পাহানি, তাজা চা ও কফির পণ্য দেখুন।', query: 'tea' },
  breakfast: { title: 'সকালের নাস্তা', description: 'ডিম, দুধ ও সকালের নাস্তার পণ্য দেখুন।', query: 'breakfast' },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const copy = CATEGORY_COPY[slug];
  if (!copy) notFound();
  return {
    title: `${copy.title} | Lucky Store`,
    description: `${copy.description} চট্টগ্রামে ক্যাশ অন ডেলিভারিতে অর্ডার করুন।`,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `https://luckystore1947.com/bn/category/${slug}`,
      languages: {
        'en-BD': `https://luckystore1947.com/category/${slug}`,
        'bn-BD': `https://luckystore1947.com/bn/category/${slug}`,
        'x-default': `https://luckystore1947.com/category/${slug}`,
      },
    },
  };
}

export default async function BengaliCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const copy = CATEGORY_COPY[slug];
  if (!copy) notFound();
  const { repo } = createProductRepository(supabase);
  const { products: catalogProducts } = await repo.search({ query: copy.query, limit: 24 });
  const productIds = catalogProducts.map((product) => product.id);
  const { data: translations } = productIds.length
    ? await supabase
        .from('item_translations')
        .select('item_id, name, description')
        .in('item_id', productIds)
        .eq('locale', 'bn')
        .eq('review_status', 'published')
    : { data: [] };
  const translationMap = new Map((translations ?? []).map((translation) => [translation.item_id, translation]));
  const products = catalogProducts.map((product) => {
    const translation = translationMap.get(product.id);
    return translation
      ? { ...product, name: translation.name, description: translation.description || product.description }
      : product;
  });
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-24">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-warm-muted">Lucky Store</p>
        <h1 className="mt-3 text-3xl font-black text-warm-fg sm:text-5xl">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-warm-muted">{copy.description} চকবাজার থেকে ১ কিমির মধ্যে ডেলিভারি পাওয়া যায়।</p>
        {products.length ? <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.map((product, index) => <GridProductCard key={product.id} product={product} locale="bn" linkName={catalogProducts[index].name} listId={`bn-${slug}`} listName={copy.title} index={index} />)}</div> : <p className="mt-10 rounded-2xl border border-warm-border p-6 text-warm-muted">এই বিভাগে এখন কোনো পণ্য পাওয়া যায়নি।</p>}
        <p className="mt-8 text-sm text-warm-muted">মূল্য, স্টক ও পণ্যের তথ্য আমাদের একই ক্যাটালগ থেকে আসে।</p>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
