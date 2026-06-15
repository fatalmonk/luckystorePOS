export const revalidate = 60;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Search</h1>
      <p className="mt-4">Query: {q ?? 'none'}</p>
    </main>
  );
}
