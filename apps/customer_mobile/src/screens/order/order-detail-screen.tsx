import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Locale } from '../../services/home';
import {
  buildWhatsAppOrderMessage,
  fetchOrder,
  getStatusStepIndex,
  MobileOrderDto,
  TIMELINE_STEPS,
} from '../../services/orders';
import { useAuth } from '../../state/auth-context';
import { colors } from '../../theme';

const copy = {
  en: {
    title: 'Order Status',
    orderPlacedTitle: 'Order Placed Successfully! 🎉',
    orderPlacedSubtitle: 'Thank you for shopping with Lucky Store.',
    orderNumber: 'Order Number',
    copied: 'Copied!',
    timelineTitle: 'Delivery Progress',
    cancelledTitle: 'Order Cancelled',
    deliveryDetails: 'Delivery Details',
    recipient: 'Recipient',
    phone: 'Phone',
    address: 'Address',
    slot: 'Delivery Slot',
    notes: 'Special Notes',
    itemsTitle: 'Ordered Items',
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery Fee',
    free: 'FREE',
    total: 'Total',
    paymentMethod: 'Payment Method',
    cod: 'Cash on Delivery',
    codNote: 'Pay in cash after inspecting products at your doorstep.',
    bkash: 'bKash Payment',
    bkashNote: 'Send payment to 01731944544.',
    whatsappButton: '💬 Confirm on WhatsApp',
    continueShopping: 'Continue Shopping',
    notFoundTitle: 'Order Not Found',
    notFoundBody: 'We couldn’t find this order. Please check the order number or log in to view your orders.',
    backHome: 'Return to Home',
  },
  bn: {
    title: 'অর্ডারের অবস্থা',
    orderPlacedTitle: 'অর্ডার সফলভাবে সম্পন্ন হয়েছে! 🎉',
    orderPlacedSubtitle: 'লাকি স্টোর থেকে কেনাকাটা করার জন্য ধন্যবাদ।',
    orderNumber: 'অর্ডার নম্বর',
    copied: 'কপি হয়েছে!',
    timelineTitle: 'ডেলিভারির অগ্রগতি',
    cancelledTitle: 'অর্ডার বাতিল করা হয়েছে',
    deliveryDetails: 'ডেলিভারির বিবরণ',
    recipient: 'গ্রাহক',
    phone: 'ফোন নম্বর',
    address: 'ঠিকানা',
    slot: 'সময়সূচী',
    notes: 'বিশেষ নির্দেশনা',
    itemsTitle: 'অর্ডারের পণ্যসমূহ',
    subtotal: 'মোট পণ্যের দাম',
    deliveryFee: 'ডেলিভারি চার্জ',
    free: 'ফ্রি',
    total: 'সর্বমোট',
    paymentMethod: 'পেমেন্ট পদ্ধতি',
    cod: 'ক্যাশ অন ডেলিভারি',
    codNote: 'দরজায় পণ্য দেখে নিশ্চিত হয়ে রাইডারকে টাকা পরিশোধ করুন।',
    bkash: 'বিকাশ পেমেন্ট',
    bkashNote: '01731944544 নম্বরে টাকা বিকাশ করুন।',
    whatsappButton: '💬 হোয়াটসঅ্যাপে নিশ্চিত করুন',
    continueShopping: 'আরও কেনাকাটা করুন',
    notFoundTitle: 'অর্ডার পাওয়া যায়নি',
    notFoundBody: 'এই অর্ডারের তথ্য পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর দিয়ে চেষ্টা করুন।',
    backHome: 'হোম পেজে ফিরুন',
  },
} as const;

interface OrderDetailScreenProps {
  orderNumber: string;
  trackingToken?: string;
}

export function OrderDetailScreen({ orderNumber, trackingToken }: OrderDetailScreenProps) {
  const router = useRouter();
  const { token: authToken } = useAuth();
  const [locale, setLocale] = useState<Locale>('en');
  const t = copy[locale];

  const [order, setOrder] = useState<MobileOrderDto | null>(null);
  const [loading, setLoading] = useState(Boolean(orderNumber));
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!orderNumber) {
      return;
    }
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const data = await fetchOrder(orderNumber, trackingToken, undefined, authToken || undefined);
      setOrder(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load order details');
    } finally {
      setRefreshing(false);
    }
  }, [orderNumber, trackingToken, authToken]);

  useEffect(() => {
    if (!orderNumber) {
      return;
    }
    const controller = new AbortController();
    fetchOrder(orderNumber, trackingToken, controller.signal, authToken || undefined)
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setErrorMessage(err.message || 'Unable to load order details');
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [orderNumber, trackingToken, authToken]);

  const handleOpenWhatsApp = () => {
    if (!order) return;
    const message = buildWhatsAppOrderMessage(order);
    const url = `https://wa.me/8801731944544?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      // Fallback if WhatsApp is not installed
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading order details…</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>{t.notFoundTitle}</Text>
          <Text style={styles.notFoundBody}>
            {errorMessage || t.notFoundBody}
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/(home)' as any)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>{t.backHome}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const currentStepIndex = getStatusStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Language Bar */}
      <View style={styles.headerBar}>
        <Text accessibilityRole="header" style={styles.screenTitle}>{t.title}</Text>
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

      {/* Hero Card */}
      <View style={styles.heroCard}>
        <Text accessibilityRole="header" style={styles.heroTitle}>
          {isCancelled ? (locale === 'bn' ? 'অর্ডারটি বাতিল হয়েছে' : 'Order Cancelled') : t.orderPlacedTitle}
        </Text>
        <Text style={styles.heroSubtitle}>
          {isCancelled
            ? (locale === 'bn' ? 'এই অর্ডারটি প্রক্রিয়া করা হয়নি বা বাতিল করা হয়েছে।' : 'This order has been cancelled and will not be delivered.')
            : t.orderPlacedSubtitle}
        </Text>

        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeLabel}>{t.orderNumber}:</Text>
          <Text style={styles.orderBadgeNumber}>#{order.orderNumber}</Text>
        </View>
      </View>

      {/* Timeline Section */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {isCancelled ? `⚠️ ${t.cancelledTitle}` : `🚚 ${t.timelineTitle}`}
        </Text>

        {!isCancelled ? (
          <View style={styles.timelineList}>
            {TIMELINE_STEPS.map((stepItem, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const label = locale === 'bn' ? stepItem.labelBn : stepItem.labelEn;

              return (
                <View key={stepItem.id} style={styles.timelineRow}>
                  <View style={styles.timelineIconCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCompleted ? styles.timelineDotCompleted : null,
                        isCurrent ? styles.timelineDotCurrent : null,
                      ]}
                    >
                      <Text style={styles.timelineDotText}>
                        {isCompleted ? '✓' : `${index + 1}`}
                      </Text>
                    </View>
                    {index < TIMELINE_STEPS.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          index < currentStepIndex ? styles.timelineLineCompleted : null,
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={styles.timelineLabelCol}>
                    <Text
                      style={[
                        styles.timelineStepLabel,
                        isCurrent ? styles.timelineStepLabelCurrent : null,
                        !isCompleted ? styles.timelineStepLabelPending : null,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.cancelledText}>
            This order has been cancelled. If you have questions, please contact our support.
          </Text>
        )}
      </View>

      {/* Delivery Details Card */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>📍 {t.deliveryDetails}</Text>
        <View style={styles.detailsTable}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t.recipient}:</Text>
            <Text style={styles.detailValue}>{order.customerName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t.phone}:</Text>
            <Text style={styles.detailValue}>{order.customerPhone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t.address}:</Text>
            <Text style={styles.detailValue}>{order.customerAddress}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t.slot}:</Text>
            <Text style={styles.detailValue}>
              {order.deliverySlot === 'morning'
                ? 'Morning (9AM–1PM)'
                : order.deliverySlot === 'evening'
                ? 'Evening (4PM–8PM)'
                : order.deliverySlot || 'Standard'}
            </Text>
          </View>
          {order.notes ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t.notes}:</Text>
              <Text style={styles.detailValue}>{order.notes}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Items Summary Card */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>📦 {t.itemsTitle} ({order.items.length})</Text>
        <View style={styles.itemsList}>
          {order.items.map((item, idx) => (
            <View key={item.id || idx} style={styles.itemRow}>
              <View style={styles.itemInfoCol}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPricePer}>
                  ৳{item.price} × {item.qty} {item.unit ? `(${item.unit})` : ''}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                ৳{item.total ?? item.price * item.qty}
              </Text>
            </View>
          ))}
        </View>

        {/* Breakdown */}
        <View style={styles.priceBreakdown}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t.subtotal}</Text>
            <Text style={styles.priceValue}>৳{order.subtotal}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t.deliveryFee}</Text>
            <Text style={[styles.priceValue, order.deliveryFee === 0 ? styles.freeText : null]}>
              {order.deliveryFee === 0 ? t.free : `৳${order.deliveryFee}`}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>{t.total}</Text>
            <Text style={styles.grandTotalValue}>৳{order.total}</Text>
          </View>
        </View>
      </View>

      {/* Payment Method Card */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>💳 {t.paymentMethod}</Text>
        <View style={styles.paymentBox}>
          <Text style={styles.paymentMethodName}>
            {order.paymentMethod === 'bkash' ? `📱 ${t.bkash}` : `💵 ${t.cod}`}
          </Text>
          <Text style={styles.paymentMethodDesc}>
            {order.paymentMethod === 'bkash' ? t.bkashNote : t.codNote}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsCol}>
        <Pressable
          style={styles.whatsappButton}
          onPress={handleOpenWhatsApp}
          accessibilityRole="button"
        >
          <Text style={styles.whatsappButtonText}>{t.whatsappButton}</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace('/(tabs)/(home)' as any)}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>{t.continueShopping}</Text>
        </Pressable>
      </View>
    </ScrollView>
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
  centerContainer: {
    flex: 1,
    backgroundColor: colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepNight,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  orderBadgeLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  orderBadgeNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.deepNight,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.deepNight,
  },
  timelineList: {
    marginTop: 4,
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 44,
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 32,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  timelineDotCurrent: {
    backgroundColor: colors.accent,
    borderColor: colors.deepNight,
  },
  timelineDotText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.deepNight,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.line,
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: colors.green,
  },
  timelineLabelCol: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: 'center',
  },
  timelineStepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.deepNight,
  },
  timelineStepLabelCurrent: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepNight,
  },
  timelineStepLabelPending: {
    color: colors.muted,
  },
  cancelledText: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 18,
  },
  detailsTable: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.muted,
    width: 70,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.deepNight,
    flex: 1,
  },
  itemsList: {
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfoCol: {
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
  freeText: {
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
  paymentBox: {
    backgroundColor: colors.paper,
    borderRadius: 10,
    padding: 12,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
    marginBottom: 2,
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  actionsCol: {
    gap: 10,
    marginTop: 6,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepNight,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  notFoundCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    width: '100%',
    maxWidth: 360,
  },
  notFoundEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepNight,
    marginBottom: 8,
  },
  notFoundBody: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
});
