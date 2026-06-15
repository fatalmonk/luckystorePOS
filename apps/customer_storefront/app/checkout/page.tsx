'use client'; // checkout flow with form state, cart context, and router

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { useToast } from '../components/Toast';
import { useCartContext } from '../components/CartProvider';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { formatBdt } from '../lib/formatPrice';

const STEPS = [
  { id: 1, label: 'Review' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Confirm' },
];

function CheckoutContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, subtotal, deliveryFee, total, clearCart } = useCartContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlacing, setIsPlacing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goToStep = (step: number) => {
    if (step > 1 && cart.length === 0) {
      showToast('Your cart is empty');
      return;
    }
    if (step === 3) {
      if (!formData.name || !formData.phone || !formData.address) {
        showToast('Please fill all required fields');
        return;
      }
      const cleanPhone = formData.phone.replace(/\s+/g, '');
      if (!cleanPhone.match(/^(?:\+880|0)1\d{9}$/)) {
        showToast('Enter valid BD phone (01XXXXXXXXX or +8801XXXXXXXXX)');
        return;
      }
    }
    setCurrentStep(step);
  };

  const placeOrder = async () => {
    const cleanPhone = formData.phone.replace(/\s+/g, '');
    if (!formData.name || !formData.phone || !formData.address) {
      showToast('Please fill all required fields');
      return;
    }
    if (!cleanPhone.match(/^(?:\+880|0)1\d{9}$/)) {
      showToast('Enter valid BD phone (01XXXXXXXXX or +8801XXXXXXXXX)');
      return;
    }

    setIsPlacing(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: '',
          customerName: formData.name,
          customerPhone: cleanPhone,
          customerAddress: formData.address,
          notes: formData.notes || undefined,
          items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, unit: c.unit })),
          subtotal,
          deliveryFee,
          total,
        }),
      });
      const { ok, order, error } = await res.json();
      if (!ok) throw new Error(error || 'Order failed');

      sessionStorage.setItem('lastOrder', JSON.stringify(order));
      clearCart();
      router.push(`/order?num=${order.order_number}`);
    } catch (e: any) {
      showToast(e?.message || 'Could not place order');
      setIsPlacing(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px]">
          <h2 className="text-lg font-bold tracking-tight mb-2">Checkout</h2>

          {/* Steps */}
          <div className="flex items-center justify-center gap-1.5 py-5">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-11 h-11 rounded-full grid place-items-center text-sm font-extrabold transition-colors ${
                    currentStep > step.id
                      ? 'bg-[rgba(45,106,79,0.08)] text-[#2d6a4f]'
                      : currentStep === step.id
                      ? 'bg-[#ffe302] text-[#1c1917]'
                      : 'bg-[#f5f5f4] text-[#a8a29e]'
                  }`}
                >
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-colors ${
                      currentStep > step.id ? 'bg-[#2d6a4f]' : 'bg-[#f5f5f4]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Review */}
          {currentStep === 1 && (
            <div className="animate-[fadeUp_0.25s_ease]">
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 border-b border-[#e7e5e4]">
                    <div className="text-[22px]">{item.emoji}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-[13px] text-[#78716c]">
                        {formatBdt(item.price)} × {item.qty}
                      </p>
                    </div>
                    <p className="font-bold">{formatBdt(item.price * item.qty)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-[18px] mb-6">
                <div className="flex justify-between mb-2.5 text-sm text-[#78716c]">
                  <span>Subtotal</span>
                  <span>{formatBdt(subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2.5 text-sm text-[#78716c]">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : formatBdt(deliveryFee)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#f5f5f4] text-lg font-extrabold text-[#1c1917]">
                  <span>Total</span>
                  <span>{formatBdt(total)}</span>
                </div>
              </div>

              <Button onClick={() => goToStep(2)} fullWidth data-testid="checkout-continue-btn">Continue →</Button>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div className="animate-[fadeUp_0.25s_ease]">
              <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-4 mb-5">
                <p className="text-xs text-[#a8a29e] uppercase tracking-widest mb-1">Store</p>
                <p className="font-bold text-[15px] mb-0.5">Lucky Store — Emdad Park</p>
                <p className="text-[13px] text-[#78716c]">665 Percival Hill Rd, Chattogram 4203</p>
              </div>

              <Input
                label="Full Name *"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Your full name"
              />
              <Input
                label="WhatsApp Number *"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+880 1XXX-XXXXXX"
              />
              <TextArea
                label="Delivery Address *"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="House, road, area…"
              />
              <Input
                label="Instructions (optional)"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="e.g. Ring bell twice"
              />

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => goToStep(1)} className="flex-1">← Back</Button>
                <Button onClick={() => goToStep(3)} className="flex-1" data-testid="checkout-place-order-btn">Place Order</Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirming */}
          {currentStep === 3 && (
            <ConfirmingStep placeOrder={placeOrder} isPlacing={isPlacing} />
          )}
        </div>
      </main>
    </>
  );
}

function ConfirmingStep({ placeOrder, isPlacing }: { placeOrder: () => void; isPlacing: boolean }) {
  useEffect(() => { placeOrder(); }, []);

  return (
    <div className="text-center py-12 animate-[fadeUp_0.25s_ease]">
      <div className="text-6xl mb-4">⏳</div>
      <h3 className="text-lg font-bold mb-2">Confirming…</h3>
      <p className="text-[#78716c]">Checking stock availability</p>
      {isPlacing && <p className="text-sm text-[#a8a29e] mt-2">Please wait...</p>}
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutContent />;
}
