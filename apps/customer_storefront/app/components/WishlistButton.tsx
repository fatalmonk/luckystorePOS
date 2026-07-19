'use client'; // wishlist form state, localStorage fingerprint, and API calls

import { useState, useEffect } from 'react';
import { createWishlistItem } from '../lib/wishlist';
import { getLocalWishlist, saveLocalWishlist } from '../lib/wishlistHelpers';
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

  useEffect(() => {
    const list = getLocalWishlist();
    if (list.includes(productId)) {
      setStatus('saved');
    }
  }, [productId]);

  const setSavedLocally = () => {
    const list = getLocalWishlist();
    if (!list.includes(productId)) {
      saveLocalWishlist([...list, productId]);
    }
  };

  const handleNotify = async () => {
    if (status === 'loading') return;

    if (status === 'saved') {
      showToast('Already on your wishlist');
      return;
    }

    if (status === 'phone') {
      if (phone && !phone.replace(/[\s-]/g, '').match(/^(?:\+880|0)1\d{9}$/)) {
        showToast('Enter a valid number: 01XXXXXXXXX or +8801XXXXXXXXX');
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
      setSavedLocally();
      setStatus('saved');
      showToast(`We'll notify you when ${productName} is back in stock`);
    } catch (e: any) {
      if (String(e).includes('Already on wishlist')) {
        setSavedLocally();
        setStatus('saved');
        showToast('Already on your wishlist');
      } else {
        showToast(`Couldn't save — please try again`);
        setStatus('idle');
      }
    }
  };

  if (status === 'loading') {
    return (
      <button disabled className="w-full h-10 bg-warm-bg border border-warm-border rounded-md text-warm-muted text-sm font-semibold animate-[fadeUp_0.2s_ease]">
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
          className="flex-1 h-10 px-3 bg-white border border-warm-border rounded-md text-sm text-warm-fg focus:outline-none focus:border-warm-accent"
        />
        <button
          onClick={handleNotify}
          disabled={false}
          className="px-4 bg-warm-accent text-warm-fg rounded-md text-sm font-semibold hover:bg-warm-accent-hover disabled:opacity-50"
        >
          Save
        </button>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <button
        onClick={handleNotify}
        className="w-full h-10 bg-warm-bg border border-warm-border rounded-md text-warm-muted text-sm font-semibold animate-[fadeUp_0.2s_ease]"
      >
        ✓ On Wishlist
      </button>
    );
  }

  return (
    <button
      onClick={() => setStatus('phone')}
      className="w-full h-10 bg-white border border-warm-border rounded-md text-warm-fg text-sm font-semibold hover:border-warm-accent transition-colors animate-[fadeUp_0.2s_ease]"
    >
      Notify Me When Back
    </button>
  );
}
