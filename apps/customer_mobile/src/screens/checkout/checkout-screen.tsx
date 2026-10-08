import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CheckoutFormData,
  CheckoutFormErrors,
  generateOrderNumber,
  generateUUID,
  submitCheckout,
  validateCheckoutForm,
} from '../../services/checkout';
import { Locale } from '../../services/home';
import { saveGuestOrderToken } from '../../services/storage';
import { useAuth } from '../../state/auth-context';
import { useCart } from '../../state/cart-context';
import { colors } from '../../theme';

const copy = {
  en: {
    checkoutTitle: 'Checkout',
    step1Title: '1. Delivery Details',
    step2Title: '2. Review & Payment',
    storeLocation: 'Lucky Store · Emdad Park, Chittagong',
    storeAddress: '665 Percival Hill Rd, Chittagong 4203',
    fullName: 'Full Name *',
    fullNamePlaceholder: 'e.g. Karim Ahmed',
    mobileNumber: 'Mobile Number *',
    mobilePlaceholder: '01XXXXXXXXX',
    mobileHint: 'Use 01XXXXXXXXX or +8801XXXXXXXXX',
    address: 'Delivery Address *',
    addressPlaceholder: 'House/Flat no., Road, Area, Landmark...',
    notes: 'Delivery Notes (Optional)',
    notesPlaceholder: 'e.g. Call before delivery, leave with guard',
    deliverySlotTitle: 'Delivery Slot',
    slotMorning: 'Morning (9AM – 1PM)',
    slotEvening: 'Evening (4PM – 8PM)',
    reviewButton: 'Review Order →',
    orderSummary: 'Order Summary',
    itemsCount: (count: number) => `${count} item${count === 1 ? '' : 's'}`,
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery Fee',
    free: 'FREE',
    total: 'Total',
    paymentMethod: 'Payment Method',
    cod: 'Cash on Delivery',
    codSubtitle: 'Inspect products at doorstep, then pay the rider.',
    bkash: 'bKash Payment',
    bkashSubtitle: 'Pay to 01731944544 via bKash personal/merchant.',
    bkashInstructions: 'Send payment of {total} to 01731944544. If you already paid, enter the TrxID below.',
    trxIdLabel: 'bKash TrxID (Optional)',
    trxIdPlaceholder: 'e.g. 9A1B2C3D4E',
    editDetails: '← Edit Details',
    placeOrder: 'Confirm & Place Order',
    placingOrder: 'Placing your order…',
    emptyCartTitle: 'Your cart is empty',
    emptyCartBody: 'Please add products to your cart before proceeding to checkout.',
    backToShop: 'Return to Shop',
    priceMismatchTitle: 'Prices have been updated',
    priceMismatchBody: 'Some item prices changed on the server. Your cart has been synced with the latest totals. Please review before confirming.',
  },
  bn: {
    checkoutTitle: 'চেকআউট',
    step1Title: '১. ডেলিভারি তথ্য',
    step2Title: '২. পর্যালোচনা ও পেমেন্ট',
    storeLocation: 'লাকি স্টোর · এমদাদ পার্ক, চট্টগ্রাম',
    storeAddress: '৬৬৫ পারসিভাল হিল রোড, চট্টগ্রাম ৪২০৩',
    fullName: 'আপনার পূর্ণ নাম *',
    fullNamePlaceholder: 'উদাঃ করিম আহমেদ',
    mobileNumber: 'মোবাইল নম্বর *',
    mobilePlaceholder: '01XXXXXXXXX',
    mobileHint: '01XXXXXXXXX অথবা +8801XXXXXXXXX ব্যবহার করুন',
    address: 'ডেলিভারি ঠিকানা *',
    addressPlaceholder: 'বাসা/ফ্ল্যাট নং, রোড, এলাকা, ল্যান্ডমার্ক...',
    notes: 'ডেলিভারি সংক্রান্ত নির্দেশনা (ঐচ্ছিক)',
    notesPlaceholder: 'উদাঃ বেল বাজাবেন না, সিকিউরিটি গার্ডের কাছে রাখুন',
    deliverySlotTitle: 'ডেলিভারির সময়সূচী',
    slotMorning: 'সকাল (৯টা – দুপুর ১টা)',
    slotEvening: 'বিকাল (৪টা – রাত ৮টা)',
    reviewButton: 'অর্ডার পর্যালোচনা করুন →',
    orderSummary: 'অর্ডারের বিবরণ',
    itemsCount: (count: number) => `${count}টি পণ্য`,
    subtotal: 'মোট পণ্যের দাম',
    deliveryFee: 'ডেলিভারি চার্জ',
    free: 'ফ্রি',
    total: 'সর্বমোট',
    paymentMethod: 'পেমেন্ট পদ্ধতি',
    cod: 'ক্যাশ অন ডেলিভারি',
    codSubtitle: 'দরজায় পণ্য দেখে নিশ্চিত হয়ে তারপর রাইডারকে টাকা দিন।',
    bkash: 'বিকাশ পেমেন্ট',
    bkashSubtitle: '01731944544 নম্বরে সেন্ড মানি বা পেমেন্ট করুন।',
    bkashInstructions: '01731944544 নম্বরে {total} টাকা বিকাশ করুন। আগেই পেমেন্ট করে থাকলে ট্রানজেকশন আইডি দিন।',
    trxIdLabel: 'বিকাশ ট্রানজেকশন আইডি (ঐচ্ছিক)',
    trxIdPlaceholder: 'উদাঃ 9A1B2C3D4E',
    editDetails: '← তথ্য পরিবর্তন',
    placeOrder: 'অর্ডার নিশ্চিত করুন',
    placingOrder: 'অর্ডার সম্পন্ন হচ্ছে…',
    emptyCartTitle: 'আপনার কার্ট খালি',
    emptyCartBody: 'চেকআউট করতে প্রথমে কার্টে পণ্য যোগ করুন।',
    backToShop: 'কেনাকাটা করতে ফিরুন',
    priceMismatchTitle: 'পণ্যের মূল্য পরিবর্তন হয়েছে',
    priceMismatchBody: 'সার্ভারে কিছু পণ্যের দাম আপডেট হয়েছে। আপনার কার্টের মূল্য হালনাগাদ করা হয়েছে। পুনরায় যাচাই করে অর্ডার করুন।',
  },
} as const;

export function CheckoutScreen() {
  const router = useRouter();
  const { token, isHydrated } = useAuth();
  const { items, subtotal, deliveryFee, total, clearCart, syncPrices } = useCart();
  const [locale, setLocale] = useState<Locale>('en');
  const t = copy[locale];

  const [step, setStep] = useState<1 | 2>(1);
  const [isPlacing, setIsPlacing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceMismatchWarning, setPriceMismatchWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState<CheckoutFormData>({
    name: '',
    phone: '',
    address: '',
    notes: '',
    deliverySlot: 'morning',
    paymentMethod: 'cod',
    trxId: '',
  });

  const [formErrors, setFormErrors] = useState<CheckoutFormErrors>({});

  const idempotencyKeyRef = useRef<string>(generateUUID());
  const orderNumberRef = useRef<string>(generateOrderNumber());
  const scrollViewRef = useRef<ScrollView>(null);

  const handleFieldChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof CheckoutFormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStep1Submit = () => {
    const errors = validateCheckoutForm(formData, locale === 'bn');
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setStep(2);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0 || !isHydrated) return;
    setIsPlacing(true);
    setErrorMessage(null);
    setPriceMismatchWarning(null);

    const result = await submitCheckout({
      formData,
      cart: items,
      subtotal,
      deliveryFee,
      total,
      idempotencyKey: idempotencyKeyRef.current,
      orderNumber: orderNumberRef.current,
      authToken: token,
    });

    if (result.success) {
      clearCart();
      const orderNumber = result.order.order_number;
      const trackingToken = result.order.trackingToken || '';
      if (trackingToken) {
        saveGuestOrderToken(orderNumber, trackingToken).catch(() => {});
      }
      setIsPlacing(false);
      router.replace({
        pathname: '/order/[number]' as any,
        params: { number: orderNumber },
      });
      return;
    }

    setIsPlacing(false);

    if (result.priceMismatch) {
      syncPrices(result.updatedItems);
      setPriceMismatchWarning(t.priceMismatchBody);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setErrorMessage(result.message);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  if (items.length === 0 && !isPlacing) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>{t.emptyCartTitle}</Text>
          <Text style={styles.emptyBody}>{t.emptyCartBody}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/(shop)' as any)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>{t.backToShop}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.screenTitle} accessibilityRole="header">{t.checkoutTitle}</Text>
            <Text style={styles.stepSubtitle}>
              {step === 1 ? t.step1Title : t.step2Title}
            </Text>
          </View>

          <Pressable
            style={styles.langPill}
            onPress={() => setLocale((prev) => (prev === 'en' ? 'bn' : 'en'))}
            accessibilityRole="button"
          >
            <Text style={styles.langPillText}>
              {locale === 'en' ? 'বাংলা' : 'EN'}
            </Text>
          </Pressable>
        </View>

        {/* Store Location Badge */}
        <View style={styles.storeBadge}>
          <Text style={styles.storeBadgeTitle}>🏪 {t.storeLocation}</Text>
          <Text style={styles.storeBadgeSubtitle}>{t.storeAddress}</Text>
        </View>

        {/* Price Mismatch Banner */}
        {priceMismatchWarning ? (
          <View style={styles.warningBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.warningBannerTitle}>⚠️ {t.priceMismatchTitle}</Text>
            <Text style={styles.warningBannerBody}>{priceMismatchWarning}</Text>
          </View>
        ) : null}

        {/* Error Banner */}
        {errorMessage ? (
          <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.errorBannerTitle}>❌ Error</Text>
            <Text style={styles.errorBannerBody}>{errorMessage}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          /* STEP 1: DELIVERY DETAILS */
          <View style={styles.formSection}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.fullName}</Text>
              <TextInput
                style={[styles.textInput, formErrors.name ? styles.inputErrorBorder : null]}
                placeholder={t.fullNamePlaceholder}
                placeholderTextColor={colors.muted}
                accessibilityLabel={t.fullName}
                value={formData.name}
                onChangeText={(val) => handleFieldChange('name', val)}
                maxLength={100}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {formErrors.name ? (
                <Text style={styles.errorText}>{formErrors.name}</Text>
              ) : null}
            </View>

            {/* Mobile Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.mobileNumber}</Text>
              <TextInput
                style={[styles.textInput, formErrors.phone ? styles.inputErrorBorder : null]}
                placeholder={t.mobilePlaceholder}
                placeholderTextColor={colors.muted}
                accessibilityLabel={t.mobileNumber}
                value={formData.phone}
                onChangeText={(val) => handleFieldChange('phone', val)}
                keyboardType="phone-pad"
                maxLength={15}
                returnKeyType="next"
              />
              {formErrors.phone ? (
                <Text style={styles.errorText}>{formErrors.phone}</Text>
              ) : (
                <Text style={styles.hintText}>{t.mobileHint}</Text>
              )}
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.address}</Text>
              <TextInput
                style={[styles.textArea, formErrors.address ? styles.inputErrorBorder : null]}
                placeholder={t.addressPlaceholder}
                placeholderTextColor={colors.muted}
                accessibilityLabel={t.address}
                value={formData.address}
                onChangeText={(val) => handleFieldChange('address', val)}
                multiline
                numberOfLines={3}
                maxLength={300}
                textAlignVertical="top"
              />
              {formErrors.address ? (
                <Text style={styles.errorText}>{formErrors.address}</Text>
              ) : null}
            </View>

            {/* Delivery Slot */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.deliverySlotTitle}</Text>
              <View style={styles.slotRow}>
                <Pressable
                  style={[
                    styles.slotCard,
                    formData.deliverySlot === 'morning' ? styles.slotCardActive : null,
                  ]}
                  onPress={() => handleFieldChange('deliverySlot', 'morning')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: formData.deliverySlot === 'morning' }}
                >
                  <Text style={styles.slotRadio}>
                    {formData.deliverySlot === 'morning' ? '🔘' : '⚪'}
                  </Text>
                  <View style={styles.slotTextCol}>
                    <Text style={styles.slotTitle}>Morning</Text>
                    <Text style={styles.slotSubtitle}>9AM – 1PM</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.slotCard,
                    formData.deliverySlot === 'evening' ? styles.slotCardActive : null,
                  ]}
                  onPress={() => handleFieldChange('deliverySlot', 'evening')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: formData.deliverySlot === 'evening' }}
                >
                  <Text style={styles.slotRadio}>
                    {formData.deliverySlot === 'evening' ? '🔘' : '⚪'}
                  </Text>
                  <View style={styles.slotTextCol}>
                    <Text style={styles.slotTitle}>Evening</Text>
                    <Text style={styles.slotSubtitle}>4PM – 8PM</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Delivery Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.notes}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t.notesPlaceholder}
                placeholderTextColor={colors.muted}
                accessibilityLabel={t.notes}
                value={formData.notes}
                onChangeText={(val) => handleFieldChange('notes', val)}
                maxLength={200}
              />
            </View>

            {/* Next Step Button */}
            <Pressable
              style={styles.primaryButton}
              onPress={handleStep1Submit}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>{t.reviewButton}</Text>
            </Pressable>
          </View>
        ) : (
          /* STEP 2: REVIEW & PAYMENT */
          <View style={styles.formSection}>
            {/* Delivery Details Summary Card */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <Text style={styles.reviewCardTitle}>📍 Delivery To</Text>
                <Pressable
                  onPress={() => setStep(1)}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text style={styles.editLinkText}>Edit</Text>
                </Pressable>
              </View>
              <Text style={styles.reviewDetailsName}>{formData.name}</Text>
              <Text style={styles.reviewDetailsText}>📞 {formData.phone}</Text>
              <Text style={styles.reviewDetailsText}>🏠 {formData.address}</Text>
              <Text style={styles.reviewDetailsText}>
                ⏰ {formData.deliverySlot === 'morning' ? t.slotMorning : t.slotEvening}
              </Text>
              {formData.notes ? (
                <Text style={styles.reviewDetailsNotes}>📝 {formData.notes}</Text>
              ) : null}
            </View>

            {/* Items Breakdown */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                📦 {t.orderSummary} ({t.itemsCount(items.length)})
              </Text>
              <View style={styles.itemsList}>
                {items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemThumb}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="contain" />
                      ) : (
                        <Text style={styles.itemEmoji}>{item.emoji || '🛒'}</Text>
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.itemPricePer}>৳{item.price} × {item.qty}</Text>
                    </View>
                    <Text style={styles.itemTotal}>৳{item.price * item.qty}</Text>
                  </View>
                ))}
              </View>

              {/* Price Breakdown */}
              <View style={styles.priceBreakdown}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t.subtotal}</Text>
                  <Text style={styles.priceValue}>৳{subtotal}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t.deliveryFee}</Text>
                  <Text style={[styles.priceValue, deliveryFee === 0 ? styles.freeDeliveryText : null]}>
                    {deliveryFee === 0 ? t.free : `৳${deliveryFee}`}
                  </Text>
                </View>
                <View style={[styles.priceRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>{t.total}</Text>
                  <Text style={styles.grandTotalValue}>৳{total}</Text>
                </View>
              </View>
            </View>

            {/* Payment Options */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>💳 {t.paymentMethod}</Text>

              {/* Cash on Delivery Option */}
              <Pressable
                style={[
                  styles.paymentOptionCard,
                  formData.paymentMethod === 'cod' ? styles.paymentOptionActive : null,
                ]}
                onPress={() => handleFieldChange('paymentMethod', 'cod')}
                accessibilityRole="radio"
                accessibilityState={{ checked: formData.paymentMethod === 'cod' }}
              >
                <View style={styles.paymentOptionHeader}>
                  <Text style={styles.paymentRadio}>
                    {formData.paymentMethod === 'cod' ? '🔘' : '⚪'}
                  </Text>
                  <View style={styles.paymentTitleCol}>
                    <Text style={styles.paymentTitle}>💵 {t.cod}</Text>
                    <Text style={styles.paymentSubtitle}>{t.codSubtitle}</Text>
                  </View>
                </View>
              </Pressable>

              {/* bKash Option */}
              <Pressable
                style={[
                  styles.paymentOptionCard,
                  formData.paymentMethod === 'bkash' ? styles.bkashOptionActive : null,
                ]}
                onPress={() => handleFieldChange('paymentMethod', 'bkash')}
                accessibilityRole="radio"
                accessibilityState={{ checked: formData.paymentMethod === 'bkash' }}
              >
                <View style={styles.paymentOptionHeader}>
                  <Text style={styles.paymentRadio}>
                    {formData.paymentMethod === 'bkash' ? '🔘' : '⚪'}
                  </Text>
                  <View style={styles.paymentTitleCol}>
                    <Text style={styles.bkashTitle}>📱 {t.bkash}</Text>
                    <Text style={styles.paymentSubtitle}>{t.bkashSubtitle}</Text>
                  </View>
                </View>

                {formData.paymentMethod === 'bkash' ? (
                  <View style={styles.bkashDetailsBox}>
                    <Text style={styles.bkashInstructionsText}>
                      {t.bkashInstructions.replace('{total}', `৳${total}`)}
                    </Text>
                    <TextInput
                      style={styles.trxIdInput}
                      placeholder={t.trxIdPlaceholder}
                      placeholderTextColor={colors.muted}
                      value={formData.trxId}
                      onChangeText={(val) => handleFieldChange('trxId', val)}
                      autoCapitalize="characters"
                      maxLength={50}
                    />
                  </View>
                ) : null}
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.backButton}
                onPress={() => setStep(1)}
                accessibilityRole="button"
                disabled={isPlacing}
              >
                <Text style={styles.backButtonText}>{t.editDetails}</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, styles.confirmButton, (isPlacing || !isHydrated) ? styles.buttonDisabled : null]}
                onPress={handlePlaceOrder}
                disabled={isPlacing || !isHydrated}
                accessibilityRole="button"
              >
                {isPlacing ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.ink} size="small" />
                    <Text style={[styles.primaryButtonText, styles.loadingText]}>
                      {t.placingOrder}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>{t.placeOrder}</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.deepNight,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.deepNight,
  },
  storeBadge: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  storeBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepNight,
    marginBottom: 2,
  },
  storeBadgeSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  warningBanner: {
    backgroundColor: '#FFF7D6',
    borderWidth: 1,
    borderColor: '#E6B800',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A6D00',
    marginBottom: 4,
  },
  warningBannerBody: {
    fontSize: 12,
    color: '#665200',
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: '#FDE8E8',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: 4,
  },
  errorBannerBody: {
    fontSize: 12,
    color: colors.danger,
    lineHeight: 18,
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepNight,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.deepNight,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.deepNight,
    minHeight: 80,
  },
  inputErrorBorder: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 11,
    color: colors.muted,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
  },
  slotCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  slotCardActive: {
    borderColor: colors.accent,
    backgroundColor: '#FFFDF5',
  },
  slotRadio: {
    fontSize: 14,
  },
  slotTextCol: {
    flex: 1,
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepNight,
  },
  slotSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepNight,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    marginLeft: 4,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  editLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green,
  },
  reviewDetailsName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  reviewDetailsText: {
    fontSize: 13,
    color: colors.deepNight,
    lineHeight: 18,
  },
  reviewDetailsNotes: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },
  itemsList: {
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemEmoji: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.deepNight,
  },
  itemPricePer: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepNight,
  },
  priceBreakdown: {
    gap: 6,
    paddingTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.deepNight,
  },
  freeDeliveryText: {
    color: colors.green,
    fontWeight: '800',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepNight,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepNight,
  },
  paymentOptionCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surface,
  },
  paymentOptionActive: {
    borderColor: colors.accent,
    backgroundColor: '#FFFDF5',
  },
  bkashOptionActive: {
    borderColor: '#E2136E',
    backgroundColor: '#FFF0F6',
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentRadio: {
    fontSize: 14,
  },
  paymentTitleCol: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  bkashTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2136E',
  },
  paymentSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  bkashDetailsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FBD5E5',
    gap: 8,
  },
  bkashInstructionsText: {
    fontSize: 11,
    color: '#555',
    lineHeight: 16,
  },
  trxIdInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E2136E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.deepNight,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  confirmButton: {
    flex: 2,
    marginTop: 0,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    width: '100%',
    maxWidth: 360,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepNight,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
});
