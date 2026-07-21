'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, SignOut, Calendar, MapPin, Phone, Package, ArrowLeft, Heart } from '@phosphor-icons/react';
import { useAuth } from '../components/providers/AuthProvider';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Header } from '../components/updated/Header';
import { formatBdt } from '../lib/formatPrice';
import { getLocalWishlist } from '../lib/wishlistHelpers';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  unit?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/profile');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const updateWishlist = () => setWishlistCount(getLocalWishlist().length);
    updateWishlist();
    window.addEventListener('storage', updateWishlist);
    return () => window.removeEventListener('storage', updateWishlist);
  }, []);

  useEffect(() => {
    if (user) {
      fetch('/api/orders')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setOrders(data.orders);
          } else {
            showToast(data.error || 'Failed to fetch order history');
          }
        })
        .catch(() => showToast('Failed to fetch order history'))
        .finally(() => setLoadingOrders(false));
    }
  }, [user, showToast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Successfully signed out');
      router.push('/');
    } catch {
      showToast('Failed to sign out');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-bg">
        <div className="text-warm-muted animate-pulse font-medium">Loading profile...</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-bg pb-12">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-stone-50 border border-warm-border text-warm-fg transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
          <h1 className="text-2xl font-bold text-warm-fg">My Profile</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Account Details */}
          <div className="md:col-span-1 bg-white border border-warm-border rounded-[24px] p-6 shadow-sm h-fit">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 bg-warm-accent text-warm-fg font-bold rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <h2 className="text-lg font-bold text-warm-fg">
                {user.user_metadata?.full_name || 'Lucky Customer'}
              </h2>
              <p className="text-xs text-warm-muted">{user.email}</p>
            </div>

            <div className="space-y-4 border-t border-warm-border pt-4">
              <div className="flex items-center gap-3 text-sm text-warm-fg">
                <Phone size={18} className="text-warm-muted" />
                <div>
                  <p className="text-[10px] text-warm-muted font-bold uppercase tracking-wider">WhatsApp Phone</p>
                  <p className="font-semibold">{user.user_metadata?.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-warm-fg">
                <Calendar size={18} className="text-warm-muted" />
                <div>
                  <p className="text-[10px] text-warm-muted font-bold uppercase tracking-wider">Member Since</p>
                  <p className="font-semibold">
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
              </div>

              <Link
                href="/wishlist"
                className="flex items-center justify-between p-3 rounded-2xl bg-warm-bg border border-warm-border hover:border-warm-accent transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                    <Heart size={18} weight="fill" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-warm-fg">My Saved Wishlist</p>
                    <p className="text-[11px] text-warm-muted">{wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} saved</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-warm-fg group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>

            <Button
              onClick={handleSignOut}
              variant="secondary"
              fullWidth
              className="mt-6 flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50/50 border-red-200 hover:border-red-300"
            >
              <SignOut size={16} weight="bold" />
              Sign Out
            </Button>
          </div>

          {/* Order History */}
          <div className="md:col-span-2 bg-white border border-warm-border rounded-[24px] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-warm-fg mb-4 flex items-center gap-2">
              <Package size={20} weight="bold" className="text-warm-muted" />
              Order History
            </h2>

            {loadingOrders ? (
              <div className="flex flex-col items-center justify-center py-12 text-warm-muted animate-pulse">
                <p>Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-warm-bg/30 rounded-[18px] border border-dashed border-warm-border">
                <p className="text-warm-muted text-sm mb-4">{"You haven't placed any orders yet."}</p>
                <Button onClick={() => router.push('/')} variant="primary" size="sm">
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-warm-border rounded-[18px] p-4 hover:border-warm-accent transition-colors duration-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-border pb-3 mb-3">
                      <div>
                        <p className="text-sm font-bold text-warm-fg">{order.order_number}</p>
                        <p className="text-[11px] text-warm-muted">
                          {new Date(order.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-warm-fg">
                        <p className="font-bold text-warm-muted mb-1 uppercase tracking-wider text-[9px]">Items</p>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>
                                {item.name} <span className="text-warm-muted">x{item.qty} {item.unit || ''}</span>
                              </span>
                              <span className="font-medium">{formatBdt(item.price * item.qty)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-warm-muted pt-2 border-t border-warm-border/50">
                        <MapPin size={14} />
                        <span className="truncate">{order.customer_address}</span>
                      </div>

                      <div className="flex justify-between items-center pt-2 text-sm">
                        <span className="text-warm-muted font-medium">Total Amount</span>
                        <span className="text-base font-bold text-warm-fg">{formatBdt(order.total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
