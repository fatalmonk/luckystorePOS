'use client';

import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../components/providers/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Minus, Money, Plus, WarningCircle } from '@phosphor-icons/react';
import { Header } from '../components/updated/Header';
import { useToast } from '../components/Toast';
import { useCartContext } from '../components/CartProvider';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { formatBdt } from '../lib/formatPrice';
import { ProductImage } from '../components/product/ProductImage';
import {
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackBeginCheckout,
  trackPurchase,
} from '../lib/analytics';
import { getLocaleFromPathname, withLocale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
  trxId?: string;
}

function QuantityControls({
  item,
  onChange,
}: {
  item: { id: string; qty: number; stock: number };
  onChange: (productId: string, delta: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-warm-border bg-warm-bg" aria-label={`Quantity for item, ${item.qty}`}>
      <button
        type="button"
        onClick={() => onChange(item.id, -1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        aria-label={item.qty === 1 ? 'Remove item' : 'Decrease quantity'}
      >
        <Minus size={14} weight="bold" aria-hidden="true" />
      </button>
      <span className="min-w-7 text-center text-xs font-bold tabular-nums text-warm-fg" aria-live="polite">{item.qty}</span>
      <button
        type="button"
        onClick={() => onChange(item.id, 1)}
        disabled={item.qty >= item.stock}
        className="flex h-8 w-8 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase quantity"
      >
        <Plus size={14} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const locale = getLocaleFromPathname(pathname);
  const dict = getDictionary(locale);
  const { showToast } = useToast();
  const { cart, subtotal, deliveryFee, total, clearCart, syncPrices, updateQty, isLoaded } = useCartContext();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, label: dict.checkout.yourInfo },
    { id: 2, label: dict.checkout.review },
  ];
  const [isPlacing, setIsPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user } = useAuth();
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const trxIdRef = useRef<HTMLInputElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const checkoutTrackedRef = useRef(false);
  const shippingTrackedRef = useRef(false);
  const orderNumberRef = useRef(`LSO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!isLoaded || cart.length === 0 || checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = trackBeginCheckout(cart, total);
  }, [cart, isLoaded, total]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.user_metadata?.full_name || '',
        phone: prev.phone || user.user_metadata?.phone || '',
        address: prev.address || user.user_metadata?.address || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && cart.length === 0 && !isPlacing) {
      router.replace('/cart');
    }
  }, [cart.length, isLoaded, isPlacing, router]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    deliverySlot: 'morning' as 'morning' | 'evening',
    paymentMethod: 'cod' as 'cod' | 'bkash',
    trxId: '',
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
      if (value.trim().length > 100) return 'Keep your name under 100 characters';
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
      if (value.trim().length < 10) return 'Add your house, road, and area';
      if (value.trim().length > 300) return 'Keep your address under 300 characters';
    }
    if (field === 'notes' && value.length > 300) {
      return 'Keep instructions under 300 characters';
    }
    return undefined;
  };

  const validateAll = (includePaymentReference = false): boolean => {
    const checkoutNotes = [
      formData.notes.trim(),
      formData.paymentMethod === 'bkash' && formData.trxId.trim() ? `bKash TrxID: ${formData.trxId.trim()}` : '',
    ].filter(Boolean).join(' — ');
    const newErrors: FormErrors = {
      name: validateField('name', formData.name),
      phone: validateField('phone', formData.phone),
      address: validateField('address', formData.address),
      notes: checkoutNotes.length > 300 ? 'Keep combined instructions and payment reference under 300 characters' : validateField('notes', formData.notes),
      trxId: includePaymentReference && formData.paymentMethod === 'bkash' && !formData.trxId.trim() ? 'Enter the bKash transaction reference' : undefined,
    };
    setErrors(newErrors);
    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      showToast('Please check the highlighted fields');
      // Focus first error field
      const firstError = newErrors.name
        ? nameRef.current
        : newErrors.phone
        ? phoneRef.current
        : newErrors.address
        ? addressRef.current
        : trxIdRef.current;
      firstError?.focus();
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return !hasErrors;
  };

  const goToStep = (step: number) => {
    if (step > 1 && cart.length === 0) {
      showToast('Your cart is empty');
      return;
    }
    if (step === 2 && !validateAll(false)) {
      return;
    }
    if (step === 2 && !shippingTrackedRef.current) {
      shippingTrackedRef.current = trackAddShippingInfo(
        cart,
        total,
        deliveryFee === 0 ? 'Free delivery over 500 BDT' : 'Local delivery 40 BDT',
      );
    }
    setSubmitError(null);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  };

  const placeOrder = async () => {
    if (!validateAll(true)) return;

    setIsPlacing(true);
    setSubmitError(null);

    try {
      trackAddPaymentInfo(cart, total, formData.paymentMethod);
      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumberRef.current,
          idempotencyKey: idempotencyKeyRef.current,
          customerName: formData.name,
          customerPhone: cleanPhone,
          customerAddress: formData.address,
          notes: [formData.notes.trim(), formData.paymentMethod === 'bkash' && formData.trxId.trim() ? `bKash TrxID: ${formData.trxId.trim()}` : ''].filter(Boolean).join(' — ') || undefined,
          deliverySlot: formData.deliverySlot,
          paymentMethod: formData.paymentMethod,
          items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, unit: c.unit })),
          subtotal,
          deliveryFee,
          total,
        }),
      });
      const result = await res.json();
      const { ok, order, error } = result;
      if (!ok) {
        if (result.code === 'PRICE_MISMATCH' && result.items) {
          syncPrices(result.items);
          setSubmitError('Prices changed. We updated your cart; please review the new total and try again.');
          showToast('Your cart prices were updated — please review again');
          setIsPlacing(false);
          return;
        }
        throw new Error(error || 'Order failed');
      }

      trackPurchase({
        transactionId: order.order_number,
        items: cart,
        value: total,
        shipping: deliveryFee,
      });

      // Transform API response (snake_case) to OrderData (camelCase) for the confirmation page
      const orderData = {
        orderNumber: order.order_number,
        name: formData.name,
        phone: cleanPhone,
        address: formData.address,
        notes: formData.notes || undefined,
        deliverySlot: formData.deliverySlot,
        paymentMethod: formData.paymentMethod,
        items: cart.map(c => ({
          id: c.id,
          name: c.name,
          price: c.price,
          qty: c.qty,
          unit: c.unit,
          total: c.price * c.qty,
        })),
        subtotal,
        deliveryFee,
        discount: 0,
        total,
        time: new Date().toISOString(),
      };
      try {
        sessionStorage.setItem('lastOrder', JSON.stringify(orderData));
      } catch (storageError) {
        console.warn('Order created, but confirmation details could not be saved:', storageError);
      }
      clearCart();
      router.push(`/order?num=${order.order_number}`);
    } catch (e: any) {
      setSubmitError(e?.message || 'Something went wrong. Please try again.');
      showToast(e?.message || `Couldn't place order — please try again`);
      setIsPlacing(false);
      // Stay on current step (step 2) — don't reset to step 1
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentStep === 1) void goToStep(2);
    else void placeOrder();
  };

  if (!isLoaded || (cart.length === 0 && !isPlacing)) {
    return (
      <>
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div
            role="status"
            aria-live="polite"
            className="mx-auto flex min-h-[45vh] max-w-md flex-col items-center justify-center px-6 text-center"
          >
            <div className="mb-4 h-12 w-12 animate-pulse rounded-full bg-warm-accent-muted" aria-hidden="true" />
            <h1 className="text-lg font-extrabold text-warm-fg">
              {isLoaded ? 'Your cart is empty' : 'Loading your cart…'}
            </h1>
            <p className="mt-2 text-sm text-warm-muted">
              {isLoaded
                ? 'Taking you back so you can add your everyday essentials.'
                : 'Checking the items saved on this device.'}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-5xl p-4 pb-24 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-warm-fg">{dict.checkout.title}</h1>
          <p className="mt-1 text-sm text-warm-muted">
            {locale === 'bn' ? 'অর্ডারের বিবরণ পূরণ করে সহজেই অর্ডার সম্পন্ন করুন।' : 'A few details, then we’ll prepare your order.'}
          </p>

          {/* Steps */}
          <nav aria-label="Checkout progress" className="py-6">
            <ol className="flex items-center justify-center gap-1.5">
            {steps.map((step, index) => (
              <li key={step.id} className="flex items-center">
                <div
                  aria-current={currentStep === step.id ? 'step' : undefined}
                  className={`w-11 h-11 rounded-full grid place-items-center text-sm font-extrabold transition-colors ${
                    currentStep > step.id
                      ? 'bg-[rgba(45,106,79,0.08)] text-warm-success'
                      : currentStep === step.id
                      ? 'bg-warm-accent text-warm-fg'
                      : 'bg-warm-border-light text-warm-muted'
                  }`}
                >
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <span className={`ml-2 hidden text-sm font-bold sm:inline ${currentStep === step.id ? 'text-warm-fg' : 'text-warm-muted'}`}>{step.label}</span>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-colors ${
                      currentStep > step.id ? 'bg-warm-success' : 'bg-warm-border-light'
                    }`}
                  />
                )}
              </li>
            ))}
            </ol>
          </nav>

          <form onSubmit={handleSubmit} noValidate>

          {/* Step 1: Details */}
          {currentStep === 1 && (
            <div className="animate-[fadeUp_0.25s_ease]">
              <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-8">
              <div className="min-w-0">
              <div className="border-b border-warm-border pb-4 mb-6">
                <p className="text-sm font-bold text-warm-muted mb-1">Store</p>
                <p className="font-bold text-[15px] mb-0.5">Lucky Store — Emdad Park</p>
                <p className="text-[13px] text-warm-muted">665 Percival Hill Rd, Chittagong 4203</p>
              </div>

              <Input
                ref={nameRef}
                label={`${dict.checkout.fullName} *`}
                required
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, name: validateField('name', formData.name) }))}
                placeholder={locale === 'bn' ? 'উদাঃ করিম আহমেদ' : 'e.g. Karim Ahmed'}
                maxLength={100}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'checkout-name-error' : undefined}
                data-testid="checkout-name-input"
              />
              {errors.name && <p id="checkout-name-error" role="alert" className="text-xs text-warm-danger -mt-2 mb-3">{errors.name}</p>}

              <Input
                ref={phoneRef}
                label={`${dict.checkout.mobileNumber} *`}
                required
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, phone: validateField('phone', formData.phone) }))}
                placeholder="01XXXXXXXXX"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'checkout-phone-error' : undefined}
                data-testid="checkout-phone-input"
              />
              {errors.phone ? (
                <p id="checkout-phone-error" role="alert" className="text-xs text-warm-danger -mt-2 mb-3">{errors.phone}</p>
              ) : (
                <p className="text-[11px] text-warm-muted -mt-2 mb-3">
                  {locale === 'bn' ? '01XXXXXXXXX অথবা +8801XXXXXXXXX ব্যবহার করুন' : 'Use 01XXXXXXXXX or +8801XXXXXXXXX'}
                </p>
              )}

              <TextArea
                ref={addressRef}
                label={`${dict.checkout.deliveryAddress} *`}
                required
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, address: validateField('address', formData.address) }))}
                placeholder={locale === 'bn' ? 'বাসা/ফ্ল্যাট নং, রোড, এলাকা, ল্যান্ডমার্ক...' : 'House/Flat no., Road, Area, Landmark...'}
                maxLength={300}
                rows={3}
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'checkout-address-error' : undefined}
                data-testid="checkout-address-input"
              />
              {errors.address && <p id="checkout-address-error" role="alert" className="text-xs text-warm-danger -mt-2 mb-3">{errors.address}</p>}

              <Input
                label={dict.checkout.deliveryNotes}
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder={locale === 'bn' ? 'উদাঃ বেল বাজাবেন না, গেটে রেখে যান' : 'e.g. Call before delivery, leave with guard'}
                maxLength={200}
                aria-invalid={!!errors.notes}
                aria-describedby={errors.notes ? 'checkout-notes-error' : undefined}
              />
              {errors.notes && <p id="checkout-notes-error" role="alert" className="text-xs text-warm-danger -mt-2 mb-3">{errors.notes}</p>}

              <div className="mb-5">
                <fieldset>
                <legend className="block text-[13px] font-bold mb-2 text-warm-fg">Delivery slot</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { id: 'morning', label: 'Morning', time: '9AM–1PM' },
                    { id: 'evening', label: 'Evening', time: '4PM–8PM' },
                  ].map((slot) => (
                    <label
                      key={slot.id}
                      className={`flex-1 py-2.5 px-3 rounded-[14px] border-2 text-sm font-bold transition-all ${
                        formData.deliverySlot === slot.id
                          ? 'border-warm-accent bg-warm-accent/10 text-warm-fg'
                          : 'border-warm-border bg-warm-surface text-warm-muted hover:border-warm-border'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="deliverySlot"
                          value={slot.id}
                          checked={formData.deliverySlot === slot.id}
                          onChange={() => updateField('deliverySlot', slot.id)}
                          className="h-4 w-4 accent-warm-accent"
                        />
                        {slot.label}
                      </span>
                      <span className="block text-[10px] font-medium mt-0.5 opacity-70">{slot.time}</span>
                    </label>
                  ))}
                </div>
                </fieldset>
              </div>

              <Button type="submit" fullWidth data-testid="checkout-review-btn">
                {locale === 'bn' ? 'অর্ডার পর্যালোচনা করুন →' : 'Review Your Order →'}
              </Button>
              </div>

              <aside className="mt-8 min-w-0 lg:sticky lg:top-4 lg:mt-0" aria-label="Order snapshot">
                <div className="rounded-[14px] border border-warm-border bg-warm-surface p-5 shadow-warm-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-extrabold tracking-tight text-warm-fg">Your order</h2>
                    <span className="text-xs font-semibold text-warm-muted">{cart.length} {cart.length === 1 ? 'item' : 'items'}</span>
                  </div>
                  <div className="space-y-3 border-b border-warm-border pb-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-warm-fg">{item.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-warm-muted">{formatBdt(item.price)} each</p>
                            <QuantityControls item={item} onChange={updateQty} />
                          </div>
                        </div>
                        <span className="shrink-0 font-bold text-warm-fg">{formatBdt(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-4 text-sm">
                    <div className="flex justify-between text-warm-muted"><span>Subtotal</span><span>{formatBdt(subtotal)}</span></div>
                    <div className="flex justify-between text-warm-muted"><span>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : formatBdt(deliveryFee)}</span></div>
                    <div className="flex justify-between border-t border-warm-border-light pt-3 text-lg font-extrabold text-warm-fg"><span>Total</span><span>{formatBdt(total)}</span></div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-warm-muted">Free delivery on orders over ৳500.</p>
                </div>
              </aside>
              </div>
            </div>
          )}

          {/* Step 2: Review & Place Order */}
          {currentStep === 2 && (
            <div className="animate-[fadeUp_0.25s_ease]">
              {!isPlacing ? (
                <>
                  {/* Submit error banner */}
                  {submitError && (
                    <div role="alert" className="bg-warm-danger-bg border border-warm-danger rounded-[14px] p-4 mb-4 flex items-start gap-3">
                      <WarningCircle className="shrink-0 text-warm-danger" size={20} weight="fill" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-bold text-warm-danger">Order couldn&apos;t be placed</p>
                        <p className="text-xs text-warm-danger mt-0.5">{submitError}</p>
                      </div>
                    </div>
                  )}

                  <h2 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-extrabold tracking-tight text-warm-fg mb-4 outline-none">
                    {dict.checkout.orderSummary}
                  </h2>

                  <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-6">
                  <div className="min-w-0">
                  <div className="space-y-2.5 mb-5">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-2 border-b border-warm-border last:border-0">
                        <div className="w-10 h-10 rounded-lg bg-warm-bg overflow-hidden flex-shrink-0 grid place-items-center relative">
                          <ProductImage
                            src={item.image_url}
                            alt={item.name}
                            category={item.category}
                            sizes="40px"
                            imageClassName="object-contain p-1"
                            iconSize={18}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[13px] text-warm-fg">{item.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] text-warm-muted">{formatBdt(item.price)} each</p>
                            <QuantityControls item={item} onChange={updateQty} />
                          </div>
                        </div>
                        <p className="font-bold text-sm text-warm-fg">{formatBdt(item.price * item.qty)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-warm-border pt-4 mb-5">
                    <h3 className="text-sm font-bold text-warm-fg mb-3">Delivery details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-3">
                        <span className="w-20 shrink-0 text-warm-muted">Name</span>
                        <span className="min-w-0 break-words font-semibold">{formData.name}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-20 shrink-0 text-warm-muted">Phone</span>
                        <span className="min-w-0 break-words">{formData.phone}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-20 shrink-0 text-warm-muted">Address</span>
                        <span className="min-w-0 break-words">{formData.address}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-20 shrink-0 text-warm-muted">Slot</span>
                        <span className="min-w-0 break-words font-semibold">
                          {formData.deliverySlot === 'morning' ? 'Morning (9AM–1PM)' : 'Evening (4PM–8PM)'}
                        </span>
                      </div>
                      {formData.notes && (
                        <div className="flex items-start gap-3">
                          <span className="w-20 shrink-0 text-warm-muted">Notes</span>
                          <span className="min-w-0 break-words">{formData.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  </div>
                  <div className="min-w-0 lg:sticky lg:top-4">
                  <div className="bg-warm-surface border border-warm-border rounded-[14px] p-[18px] mb-6">
                    <div className="flex justify-between mb-2.5 text-sm text-warm-muted">
                      <span>{dict.checkout.subtotal}</span>
                      <span>{formatBdt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between mb-2.5 text-sm text-warm-muted">
                      <span>{dict.checkout.deliveryFee}</span>
                      <span>{deliveryFee === 0 ? dict.checkout.free : formatBdt(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-warm-border-light text-lg font-extrabold text-warm-fg">
                      <span>{dict.checkout.total}</span>
                      <span>{formatBdt(total)}</span>
                    </div>
                    <fieldset className="mt-4">
                      <legend className="text-sm font-bold text-warm-fg">
                        {dict.checkout.paymentMethod}
                      </legend>
                      <div className="mt-2 grid gap-2">
                        <label
                          className={`cursor-pointer rounded-xl border-2 p-3 transition-colors ${
                            formData.paymentMethod === 'cod'
                              ? 'border-warm-accent bg-warm-accent/10'
                              : 'border-warm-border bg-warm-bg'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="cod"
                              checked={formData.paymentMethod === 'cod'}
                              onChange={() => updateField('paymentMethod', 'cod')}
                              className="h-4 w-4 accent-warm-accent"
                            />
                          <span>
                              <span className="flex items-center gap-1 text-sm font-extrabold text-warm-fg">
                                <Money size={16} weight="bold" aria-hidden="true" /> {dict.checkout.cashOnDelivery}
                              </span>
                              <span className="mt-0.5 block text-xs text-warm-muted">{locale === 'bn' ? 'পণ্য হাতে পেয়ে নগদ টাকা পরিশোধ করুন।' : 'Pay the rider when your order arrives.'}</span>
                            </span>
                          </span>
                        </label>

                        <label
                          className={`cursor-pointer rounded-xl border-2 p-3 transition-colors ${
                            formData.paymentMethod === 'bkash'
                              ? 'border-[#e2136e] bg-[#e2136e]/5'
                              : 'border-warm-border bg-warm-bg'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="bkash"
                              checked={formData.paymentMethod === 'bkash'}
                              onChange={() => updateField('paymentMethod', 'bkash')}
                              className="h-4 w-4 accent-[#e2136e]"
                              data-testid="checkout-payment-bkash"
                            />
                            <span>
                              <span className="block text-sm font-extrabold text-warm-fg">{dict.checkout.bKash}</span>
                              <span className="mt-0.5 block text-xs text-warm-muted">{locale === 'bn' ? '01731944544 নম্বরে বিকাশ করুন।' : 'Pay to 01731944544.'}</span>
                            </span>
                          </span>
                        </label>
                      </div>

                      {formData.paymentMethod === 'bkash' && (
                        <div className="mt-3 rounded-xl border border-[#e2136e]/30 bg-[#e2136e]/5 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="shrink-0 self-start overflow-hidden rounded-lg border border-warm-border bg-white p-1">
                              <Image
                                src="/images/payments/bkash-payment-qr.png"
                                alt="bKash payment QR code for 01731944544"
                                width={132}
                                height={176}
                                className="h-auto w-[132px]"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-warm-fg">Pay {formatBdt(total)} with bKash</p>
                              <p className="mt-1 text-xs leading-5 text-warm-muted">
                                Scan the QR or send payment to <span className="font-bold text-warm-fg">01731944544</span>.
                                Pay before placing the order, then add the transaction reference below. Payment is reviewed manually after submission.
                              </p>
                              <Input
                                ref={trxIdRef}
                                label="bKash TrxID"
                                value={formData.trxId}
                                onChange={(e) => updateField('trxId', e.target.value)}
                                placeholder="e.g. 9A1B2C3D4E"
                                maxLength={100}
                                required
                                className="mt-3 bg-white"
                                aria-invalid={!!errors.trxId}
                                aria-describedby={errors.trxId ? 'checkout-trxid-error' : undefined}
                                data-testid="checkout-bkash-trxid"
                              />
                              {errors.trxId && <p id="checkout-trxid-error" role="alert" className="text-xs text-warm-danger -mt-2">{errors.trxId}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </fieldset>
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={() => goToStep(1)} className="flex-1">
                      {locale === 'bn' ? '← তথ্য সংশোধন' : '← Edit Details'}
                    </Button>
                    <Button type="submit" className="hidden flex-1 lg:inline-flex" data-testid="checkout-place-order-btn">
                      {dict.checkout.placeOrder}
                    </Button>
                  </div>
                  </div>
                  </div>
                  <div className="fixed inset-x-0 bottom-0 z-20 border-t border-warm-border bg-warm-surface/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
                    <Button type="submit" fullWidth data-testid="checkout-place-order-mobile">
                      {dict.checkout.placeOrder} · {formatBdt(total)}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 animate-[fadeUp_0.25s_ease]">
                  <div className="mx-auto mb-5 w-full max-w-sm rounded-[14px] border border-warm-border bg-warm-surface p-4 text-left" role="status" aria-live="polite">
                    <div className="mb-3 h-3 w-28 animate-pulse rounded bg-warm-border-light" />
                    <div className="space-y-2">
                      <div className="h-3 w-full animate-pulse rounded bg-warm-border-light" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-warm-border-light" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-warm-border-light" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Placing your order…</h3>
                  <p className="text-warm-muted">We’re checking the final details now.</p>
                </div>
              )}
            </div>
          )}
          </form>
        </div>
      </main>
    </>
  );
}

export default function CheckoutPage() {
  return <CheckoutContent />;
}
