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

  return (
    <form
      action="/category"
      method="GET"
      onSubmit={handleSubmit}
      className="relative w-full max-w-xl"
    >
      <input
        name="q"
        type="text"
        placeholder="Search everything..."
        className="w-full h-10 pl-4 pr-11 rounded-full bg-[#f5f5f4] border border-transparent focus:border-[#ffe302] focus:bg-white outline-none text-sm transition-all shadow-sm"
      />
      <button
        type="submit"
        className="absolute right-1 top-1 h-8 w-8 bg-[#ffe302] rounded-full flex items-center justify-center text-[#1c1917] hover:bg-[#ffec50] transition-colors"
        aria-label="Search"
      >
        <span aria-hidden="true" className="text-base">🔍</span>
      </button>
    </form>
  );
}
