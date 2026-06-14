'use client'; // search form with client-side router for instant redirect (fallback to form submit)

import { useRouter } from 'next/navigation';

export function HeaderSearch() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const q = String(formData.get('q') ?? '').trim();
    if (q) {
      e.preventDefault();
      router.push(`/category?q=${encodeURIComponent(q)}`);
    }
    // Without JS, the form submits normally to /category?q=...
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = e.currentTarget.value.trim();
      if (term) {
        router.push(`/category?q=${encodeURIComponent(term)}`);
      }
    }
  };

  return (
    <form
      action="/category"
      method="GET"
      onSubmit={handleSubmit}
      className="relative flex-1 max-w-2xl mx-2"
    >
      <input
        name="q"
        type="text"
        placeholder="Search everything..."
        className="w-full h-11 pl-4 pr-12 rounded-full bg-white border-2 border-transparent focus:border-[#0071DC] outline-none text-sm shadow-sm"
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        className="absolute right-1 top-1 min-h-[44px] min-w-[44px] bg-[#0071DC] rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
        aria-label="Search"
      >
        <span aria-hidden="true">🔍</span>
      </button>
    </form>
  );
}
