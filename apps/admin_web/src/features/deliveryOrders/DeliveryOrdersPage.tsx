import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { PageHeader } from '../../components/layout/PageHeader';
import { SkeletonCard, ErrorState } from '../../components/PageState';
import { 
  ShoppingBag, Search, Filter, Phone, MapPin, User, 
  Calendar, Check, ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { formatCurrency } from '../../lib/format';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

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
  tenant_id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  payment_method: string;
  created_at: string;
}

export function DeliveryOrdersPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Fetch Delivery Orders
  const { data: orders = [], isLoading, isError, refetch } = useQuery<Order[]>({
    queryKey: ['delivery-orders', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Order[];
    },
    enabled: !!storeId,
  });

  // Realtime subscription for changes on the orders table
  useRealtimeSubscription({
    table: 'orders',
    event: '*',
    filter: storeId ? `store_id=eq.${storeId}` : undefined,
    invalidateKeys: [['delivery-orders', storeId]],
    onEvent: (payload) => {
      if (payload.eventType === 'INSERT') {
        const orderNum = (payload.new as any).order_number || 'New';
        notify(`New delivery order received: ${orderNum}`, 'success');
      } else if (payload.eventType === 'UPDATE') {
        const orderNum = (payload.new as any).order_number || 'Order';
        const newStatus = (payload.new as any).status;
        notify(`Order ${orderNum} status updated to ${newStatus}`, 'info');
      }
    },
  });

  // Mutate Order Status
  const statusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      notify(`Status updated to ${variables.nextStatus}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['delivery-orders', storeId] });
    },
    onError: (err: any) => {
      notify(`Failed to update status: ${err.message || err}`, 'error');
    }
  });

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'out_for_delivery':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery);

    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title={t('nav.deliveryOrders')} subtitle="Monitor and update active storefront delivery orders." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState message="Failed to load delivery orders." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title={t('nav.deliveryOrders')} 
        subtitle="Manage home delivery orders placed by online storefront customers in real time." 
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-warm-surface border border-warm-border-warm rounded-xl p-4 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-warm-muted" size={18} />
          <input
            type="text"
            placeholder="Search by order number, customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-warm-border-warm rounded-lg focus:outline-none focus:ring-1 focus:ring-warm-accent bg-warm-bg text-warm-fg"
          />
        </div>
        
        <div className="flex gap-2 min-w-[180px]">
          <Filter className="my-auto text-warm-muted" size={18} />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-warm-border-warm rounded-lg focus:outline-none focus:ring-1 focus:ring-warm-accent bg-warm-bg text-warm-fg text-sm font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-warm-surface border border-warm-border-warm rounded-xl p-12 text-center text-warm-muted">
          <ShoppingBag size={48} className="mx-auto mb-4 text-warm-accent/40" />
          <h3 className="text-lg font-bold text-warm-fg">No orders found</h3>
          <p className="text-sm mt-1">No delivery orders match the search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const isExpanded = !!expandedOrders[order.id];
            const timeAgo = formatDistanceToNow(parseISO(order.created_at), { addSuffix: true });

            return (
              <div 
                key={order.id} 
                className="bg-warm-surface border border-warm-border-warm rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                {/* Order Card Header */}
                <div className="p-5 border-b border-warm-border-warm/65 bg-warm-bg/40 flex justify-between items-center">
                  <div>
                    <h3 className="font-mono text-sm font-bold text-warm-fg tracking-tight">{order.order_number}</h3>
                    <p className="text-[11px] text-warm-muted flex items-center gap-1.5 mt-1 font-semibold">
                      <Calendar size={12} />
                      {timeAgo}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusBadgeClass(order.status)}`}>
                    {order.status.toUpperCase().replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Customer details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="text-warm-muted font-semibold uppercase tracking-wider text-[10px]">Customer Details</p>
                      <p className="font-bold text-warm-fg flex items-center gap-1.5"><User size={13} className="text-warm-dim" /> {order.customer_name}</p>
                      <p className="text-warm-dim flex items-center gap-1.5"><Phone size={13} className="text-warm-dim" /> {order.customer_phone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-warm-muted font-semibold uppercase tracking-wider text-[10px]">Delivery Location</p>
                      <p className="text-warm-fg leading-relaxed flex items-start gap-1.5"><MapPin size={13} className="text-warm-dim mt-0.5" /> {order.customer_address}</p>
                    </div>
                  </div>

                  {/* Order Financials Banner */}
                  <div className="bg-warm-bg border border-warm-border-warm rounded-lg p-3 flex justify-between text-xs">
                    <div>
                      <span className="text-warm-muted">Items: </span>
                      <span className="font-bold text-warm-fg">{order.items.reduce((sum, item) => sum + item.qty, 0)}</span>
                    </div>
                    <div>
                      <span className="text-warm-muted">Delivery: </span>
                      <span className="font-bold text-warm-fg">{formatCurrency(order.delivery_fee)}</span>
                    </div>
                    <div>
                      <span className="text-warm-muted font-bold">Total: </span>
                      <span className="font-extrabold text-warm-success text-sm font-mono">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  {/* Notes if any */}
                  {order.notes && (
                    <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-2.5 text-xs text-amber-800 flex gap-2">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                      <p><strong>Instructions:</strong> {order.notes}</p>
                    </div>
                  )}

                  {/* Expanded Items details */}
                  <div>
                    <button 
                      onClick={() => toggleExpand(order.id)}
                      className="text-xs text-warm-accent hover:underline flex items-center gap-1 font-bold focus:outline-none"
                    >
                      {isExpanded ? (
                        <>Hide Items <ChevronUp size={14} /></>
                      ) : (
                        <>Show Items ({order.items.length}) <ChevronDown size={14} /></>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 border border-warm-border-warm/60 rounded-lg overflow-hidden bg-warm-bg/25">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-warm-bg/60 border-b border-warm-border-warm/60 text-[10px] uppercase font-bold text-warm-muted">
                              <th className="px-3 py-2">Item</th>
                              <th className="px-3 py-2 text-right">Price</th>
                              <th className="px-3 py-2 text-center">Qty</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-warm-border-warm/40">
                            {order.items.map((item, index) => (
                              <tr key={index} className="text-warm-fg">
                                <td className="px-3 py-2 font-medium">{item.name}</td>
                                <td className="px-3 py-2 text-right font-mono">{formatCurrency(item.price)}</td>
                                <td className="px-3 py-2 text-center font-mono">{item.qty} {item.unit}</td>
                                <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(item.price * item.qty)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                {['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(order.status) && (
                  <div className="p-4 border-t border-warm-border-warm/50 bg-warm-bg/20 flex justify-end gap-2.5">
                    {order.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: 'cancelled' })}
                          disabled={statusMutation.isPending}
                          className="px-3 py-1.5 text-xs font-bold text-warm-danger border border-warm-danger/20 hover:bg-warm-danger/10 rounded-lg transition-colors focus:outline-none"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: 'confirmed' })}
                          disabled={statusMutation.isPending}
                          className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 focus:outline-none"
                        >
                          <Check size={14} /> Confirm
                        </button>
                      </>
                    )}
                    {order.status === 'confirmed' && (
                      <button 
                        onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: 'preparing' })}
                        disabled={statusMutation.isPending}
                        className="px-4 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors focus:outline-none"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button 
                        onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: 'out_for_delivery' })}
                        disabled={statusMutation.isPending}
                        className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors focus:outline-none"
                      >
                        Send for Delivery
                      </button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <button 
                        onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: 'delivered' })}
                        disabled={statusMutation.isPending}
                        className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors focus:outline-none"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default DeliveryOrdersPage;
