'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { useToast } from '../components/Toast';
import { useCartContext } from '../components/CartProvider';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { formatBdt } from '../lib/formatPrice';

const STEPS = [
  { id: 1, label: 'Your Info' },
  { id: 2, label: 'Review' },
];

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
}

function CheckoutContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, subtotal, deliveryFee, total, clearCart } = useCartContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlacing, setIsPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    deliverySlot: 'morning' as 'morning' | 'evening',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on edit
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateField = (field: keyof FormErrors, value: string): string | undefined => {
    if (field === 'name') {
      if (!value.trim()) return 'Enter your full name';
      if (value.trim().length < 2) return 'Enter your full name';
    }
    if (field === 'phone') {
      if (!value.trim()) return 'Enter your WhatsApp number';
      const cleanPhone = value.replace(/[\s-]/g, '');
      if (!cleanPhone.match(/^(?:\+880|0)1\d{9}$/)) {
        return 'Format: 01XXXXXXXXX or +8801XXXXXXXXX';
      }
    }
    if (field === 'address') {
      if (!value.trim()) return 'Enter your delivery address';
      if (value.trim().length < 8) return 'Add your house, road, and area';
    }
    return undefined;
  };

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {
      name: validateField('name', formData.name),
      phone: validateField('phone', formData.phone),
      address: validateField('address', formData.address),
    };
    setErrors(newErrors);
    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      showToast('Please check the highlighted fields');
      // Focus first error field
      if (newErrors.phone) {
        phoneRef.current?.focus();
        phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    return !hasErrors;
  };

  const goToStep = (step: number) => {
    if (step > 1 && cart.length === 0) {
      showToast('Your cart is empty');
      return;
    }
    if (step === 2 && !validateAll()) {
      return;
    }
    setSubmitError(null);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeOrder = async () => {
    if (!validateAll()) return;

    setIsPlacing(true);
    setSubmitError(null);

    try {
      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: '',
          customerName: formData.name,
          customerPhone: cleanPhone,
          customerAddress: formData.address,
          notes: formData.notes || undefined,
          deliverySlot: formData.deliverySlot,
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
      setSubmitError(e?.message || 'Something went wrong. Please try again.');
      showToast(e?.message || `Couldn't place order — please try again`);
      setIsPlacing(false);
      // Stay on current step (step 2) — don't reset to step 1
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
                      : 'bg-[#f5f5f4] text-[#78716c]'
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

          {/* Step 1: Details */}
          {currentStep === 1 && (
            <div className="animate-[fadeUp_0.25s_ease]">
              <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-4 mb-5">
                <p className="text-xs text-[#78716c] uppercase tracking-widest mb-1">Store</p>
                <p className="font-bold text-[15px] mb-0.5">Lucky Store — Emdad Park</p>
                <p className="text-[13px] text-[#78716c]">665 Percival Hill Rd, Chittagong 4203</p>
              </div>

              <Input
                label="Full Name *"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, name: validateField('name', formData.name) }))}
                placeholder="e.g. Karim Ahmed"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-red-500 -mt-2 mb-3">{errors.name}</p>}

              <Input
                ref={phoneRef}
                label="WhatsApp Number *"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, phone: validateField('phone', formData.phone) }))}
                placeholder="01XXXXXXXXX"
                aria-invalid={!!errors.phone}
              />
              {errors.phone ? (
                <p className="text-xs text-red-500 -mt-2 mb-3">{errors.phone}</p>
              ) : (
                <p className="text-[11px] text-[#78716c] -mt-2 mb-3">Use 01XXXXXXXXX or +8801XXXXXXXXX</p>
              )}

              <TextArea
                label="Delivery Address *"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, address: validateField('address', formData.address) }))}
                placeholder="House, road, area…"
                aria-invalid={!!errors.address}
              />
              {errors.address && <p className="text-xs text-red-500 -mt-2 mb-3">{errors.address}</p>}

              <Input
                label="Instructions (optional)"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="e.g. Ring bell twice, call before arriving"
              />

              <div className="mb-5">
                <p className="block text-[13px] font-bold mb-2 text-[#1c1917]">Delivery Slot</p>
                <div className="flex gap-2">
                  {[
                    { id: 'morning', label: 'Morning', time: '9AM–1PM' },
                    { id: 'evening', label: 'Evening', time: '4PM–8PM' },
                  ].map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => updateField('deliverySlot', slot.id)}
                      className={`flex-1 py-2.5 px-3 rounded-[14px] border-2 text-sm font-bold transition-all ${
                        formData.deliverySlot === slot.id
                          ? 'border-warm-accent bg-warm-accent/10 text-[#1c1917]'
                          : 'border-[#e7e5e4] bg-white text-[#78716c] hover:border-[#d6d3d1]'
                      }`}
                    >
                      {slot.label}
                      <span className="block text-[10px] font-medium mt-0.5 opacity-70">{slot.time}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={() => goToStep(2)} fullWidth data-testid="checkout-review-btn">
                Review Your Order →
              </Button>
            </div>
          )}

          {/* Step 2: Review & Place Order */}
          {currentStep === 2 && (
            <div className="animate-[fadeUp_0.25s_ease]">
              {!isPlacing ? (
                <>
                  {/* Submit error banner */}
                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-[14px] p-4 mb-4 flex items-start gap-3">
                      <span className="text-red-500 text-lg flex-shrink-0" aria-hidden="true">⚠️</span>
                      <div>
                        <p className="text-sm font-bold text-red-700">Order couldn&apos;t be placed</p>
                        <p className="text-xs text-red-600 mt-0.5">{submitError}</p>
                      </div>
                    </div>
                  )}

                  <h3 className="text-sm font-bold text-[#78716c] uppercase tracking-widest mb-4">Order Summary</h3>

                  <div className="space-y-3 mb-5">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[#f5f5f4]">
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

                  <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-4 mb-5">
                    <h4 className="text-xs font-bold text-[#78716c] uppercase tracking-widest mb-3">Delivery Details</h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex">
                        <span className="text-[#78716c] w-20">Name</span>
                        <span className="font-semibold">{formData.name}</span>
                      </div>
                      <div className="flex">
                        <span className="text-[#78716c] w-20">Phone</span>
                        <span>{formData.phone}</span>
                      </div>
                      <div className="flex">
                        <span className="text-[#78716c] w-20">Address</span>
                        <span>{formData.address}</span>
                      </div>
                      <div className="flex">
                        <span className="text-[#78716c] w-20">Slot</span>
                        <span className="font-semibold">
                          {formData.deliverySlot === 'morning' ? 'Morning (9AM–1PM)' : 'Evening (4PM–8PM)'}
                        </span>
                      </div>
                      {formData.notes && (
                        <div className="flex">
                          <span className="text-[#78716c] w-20">Notes</span>
                          <span>{formData.notes}</span>
                        </div>
                      )}
                    </div>
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
                    <p className="text-xs text-[#78716c] mt-2 flex items-center gap-1">
                      <span aria-hidden="true">💵</span> Cash on Delivery — pay when you receive
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => goToStep(1)} className="flex-1">← Edit Details</Button>
                    <Button onClick={placeOrder} className="flex-1" data-testid="checkout-place-order-btn">Place Order</Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 animate-[fadeUp_0.25s_ease]">
                  <div className="text-6xl mb-4">⏳</div>
                  <h3 className="text-lg font-bold mb-2">Placing your order…</h3>
                  <p className="text-[#78716c]">This usually takes a few seconds</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function CheckoutPage() {
  return <CheckoutContent />;
}