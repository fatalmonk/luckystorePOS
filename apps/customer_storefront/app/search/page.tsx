import { redirect } from 'next/navigation';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  if (!q) redirect('/category');
  redirect(`/category?q=${encodeURIComponent(q)}`);
}