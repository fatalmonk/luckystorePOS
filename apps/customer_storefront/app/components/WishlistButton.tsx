'use client'; // wishlist form state, localStorage fingerprint, and API calls

import { useState } from 'react';
import { createWishlistItem } from '../lib/wishlist';
import { useToast } from './Toast';

export function getOrCreateFingerprint(): string {
  if (typeof window === 'undefined') return '';
  let fp = localStorage.getItem('lucky_store_fp');
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem('lucky_store_fp', fp);
  }
  return fp;
}

interface WishlistButtonProps {
  productId: string;
  productName: string;
}

export function WishlistButton({ productId, productName }: WishlistButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'phone'>('idle');
  const [phone, setPhone] = useState('');
  const { showToast } = useToast();

  const handleNotify = async () => {
    if (status === 'loading' || status === 'saved') return;

    if (status === 'phone') {
      if (phone && !phone.match(/^\+880\s?1\d{9}$/)) {
        showToast('Enter a valid number: +880 1XXXXXXXXX');
        return;
      }
      setStatus('loading');
    } else {
      setStatus('phone');
      return;
    }

    try {
      const fp = getOrCreateFingerprint();
      await createWishlistItem(productId, fp, productName, phone || undefined);
      setStatus('saved');
      showToast(`We'll notify you when ${productName} is back in stock`);
    } catch (e: any) {
      if (String(e).includes('Already on wishlist')) {
        showToast('Already on your wishlist');
        setStatus('saved');
      } else {
        showToast(`Couldn't save — please try again`);
        setStatus('idle');
      }
    }
  };

  if (status === 'loading') {
    return (
      <button disabled className="w-full h-10 bg-[#faf8f5] border border-[#e7e5e4] rounded-md text-[#78716c] text-sm font-semibold animate-[fadeUp_0.2s_ease]">
        Saving...
      </button>
    );
  }

  if (status === 'phone') {
    return (
      <div className="flex gap-2 animate-[fadeUp_0.2s_ease]">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+880 1XXXXXXXXX (optional)"
          className="flex-1 h-10 px-3 bg-white border border-[#e7e5e4] rounded-md text-sm text-[#1c1917] focus:outline-none focus:border-[#ffe302]"
        />
        <button
          onClick={handleNotify}
          disabled={false}
          className="px-4 bg-[#ffe302] text-[#1c1917] rounded-md text-sm font-semibold hover:bg-[#ffec50] disabled:opacity-50"
        >
          Save
        </button>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <button disabled className="w-full h-10 bg-[#faf8f5] border border-[#e7e5e4] rounded-md text-[#78716c] text-sm font-semibold animate-[fadeUp_0.2s_ease]">
        ✓ On Wishlist
      </button>
    );
  }

  return (
    <button
      onClick={() => setStatus('phone')}
      className="w-full h-10 bg-white border border-[#e7e5e4] rounded-md text-[#1c1917] text-sm font-semibold hover:border-[#ffe302] transition-colors animate-[fadeUp_0.2s_ease]"
    >
      Notify Me When Back
    </button>
  );
}
