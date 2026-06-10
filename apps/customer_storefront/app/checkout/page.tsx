'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { ToastProvider, useToast } from '../components/Toast';
import { CartProvider, useCartContext } from '../components/CartProvider';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';

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
    name: 'Rafiq Karim',
    phone: '+880 1712-345678',
    address: 'House 15, Road 4A, Dhanmondi',
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
    setCurrentStep(step);
  };

  const placeOrder = () => {
    if (!formData.name || !formData.phone || !formData.address) {
      showToast('Please fill all required fields');
      return;
    }

    setIsPlacing(true);

    // Simulate order placement
    setTimeout(() => {
      const now = new Date();
      const orderNumber = `LSO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}-001`;

      // Store order data for order page
      const orderData = {
        orderNumber,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        items: cart.reduce((s, c) => s + c.qty, 0),
        total,
        time: now.toLocaleTimeString('en-BD', { hour: 'numeric', minute: '2-digit', hour12: true }),
      };

      sessionStorage.setItem('lastOrder', JSON.stringify(orderData));
      clearCart();
      router.push(`/order?num=${orderNumber}`);
    }, 1400);
  };

  return (
    <>
      <Header cartCount={cart.length} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px]">
          <h2 className="text-lg font-bold tracking-tight mb-2">Checkout</h2>

          {/* Steps */}
          <div className="flex items-center justify-center gap-1.5 py-5">
            {STEPS.map((step, index) => (
              <>
                <div
                  key={step.id}
                  className={`w-7 h-7 rounded-full grid place-items-center text-xs font-extrabold transition-colors ${
                    currentStep > step.id
                      ? 'bg-[rgba(45,106,79,0.08)] text-[#2d6a4f]'
                      : currentStep === step.id
                      ? 'bg-[#dc5f3b] text-white'
                      : 'bg-[#f5f5f4] text-[#a8a29e]'
                  }`}
                >
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 transition-colors ${
                      currentStep > step.id ? 'bg-[#2d6a4f]' : 'bg-[#f5f5f4]'
                    }`}
                  />
                )}
              </>
            ))}
          </div>

          {/* Step 1: Review */}
          {currentStep === 1 && (
            <div className="animate-[fadeUp_0.25s_ease]">
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-3 border-b border-[#e7e5e4]"
                  >
                    <div className="text-[22px]">{item.emoji}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-[13px] text-[#78716c]">
                        ৳{item.price} × {item.qty}
                      </p>
                    </div>
                    <p className="font-bold">৳{item.price * item.qty}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-[18px] mb-6">
                <div className="flex justify-between mb-2.5 text-sm text-[#78716c]">
                  <span>Subtotal</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="flex justify-between mb-2.5 text-sm text-[#78716c]">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `৳${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#f5f5f4] text-lg font-extrabold text-[#1c1917]">
                  <span>Total</span>
                  <span>৳{total}</span>
                </div>
              </div>

              <Button onClick={() => goToStep(2)} fullWidth>
                Continue →
              </Button>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div className="animate-[fadeUp_0.25s_ease]">
              {/* Store Info */}
              <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-4 mb-5">
                <p className="text-xs text-[#a8a29e] uppercase tracking-widest mb-1">Store</p>
                <p className="font-bold text-[15px] mb-0.5">Lucky Store — Emdad Park</p>
                <p className="text-[13px] text-[#78716c]">665 Percival Hill Rd, Chattogram 4203</p>
              </div>

              {/* Form */}
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
                <Button variant="secondary" onClick={() => goToStep(1)} className="flex-1">
                  ← Back
                </Button>
                <Button onClick={() => goToStep(3)} className="flex-1">
                  Place Order
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirming */}
          {currentStep === 3 && <ConfirmingStep placeOrder={placeOrder} />}
        </div>
      </main>
    </>
  );
}

function ConfirmingStep({ placeOrder }: { placeOrder: () => void }) {
  useEffect(() => {
    placeOrder();
  }, [placeOrder]);

  return (
    <div className="text-center py-12 animate-[fadeUp_0.25s_ease]">
      <div className="text-6xl mb-4">⏳</div>
      <h3 className="text-lg font-bold mb-2">Confirming…</h3>
      <p className="text-[#78716c]">Checking stock availability</p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ToastProvider>
      <CartProvider>
        <CheckoutContent />
      </CartProvider>
    </ToastProvider>
  );
}
