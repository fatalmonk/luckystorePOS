import { redirect } from 'next/navigation';
import { SearchClientPage } from './SearchClientPage';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  if (q) {
    redirect(`/category?q=${encodeURIComponent(q)}`);
  }
  return <SearchClientPage />;
}