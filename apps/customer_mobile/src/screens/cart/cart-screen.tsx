import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Locale } from '../../services/home';
import { CartItem, useCart } from '../../state/cart-context';
import { useTabBarScroll } from '../../state/tab-bar-scroll-context';
import { colors, TAB_BAR_BOTTOM_CLEARANCE } from '../../theme';

const copy = {
  en: {
    title: 'Shopping Cart',
    itemsCount: (count: number) => `${count} item${count === 1 ? '' : 's'}`,
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Add rice, oil, snacks and groceries from Lucky Store to get started.',
    startShopping: 'Start Shopping',
    freeDeliveryUnlocked: '✓ You unlocked FREE delivery in Chattogram!',
    freeDeliveryAway: (amount: number) => `Add ৳${amount} more for FREE delivery`,
    orderSummary: 'Order Summary',
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery Fee',
    free: 'FREE',
    total: 'Total',
    codNote: '💵 Cash on Delivery · Pay after doorstep product inspection',
    checkout: 'Proceed to Checkout',
    clearCart: 'Clear Cart',
    remove: 'Remove',
  },
  bn: {
    title: 'শপিং কার্ট',
    itemsCount: (count: number) => `${count}টি পণ্য`,
    emptyTitle: 'আপনার কার্ট খালি',
    emptyBody: 'কেনাকাটা শুরু করতে লাকি স্টোর থেকে নিত্যপ্রয়োজনীয় পণ্য যোগ করুন।',
    startShopping: 'কেনাকাটা শুরু করুন',
    freeDeliveryUnlocked: '✓ আপনি চট্টগ্রামে ফ্রি ডেলিভারি পেয়েছেন!',
    freeDeliveryAway: (amount: number) => `আর ৳${amount} টাকার পণ্য কিনলে ফ্রি ডেলিভারি`,
    orderSummary: 'অর্ডারের বিবরণ',
    subtotal: 'মোট পণ্যের দাম',
    deliveryFee: 'ডেলিভারি চার্জ',
    free: 'ফ্রি',
    total: 'সর্বমোট',
    codNote: '💵 ক্যাশ অন ডেলিভারি · পণ্য দেখে তারপর মূল্য পরিশোধ করুন',
    checkout: 'অর্ডার সম্পন্ন করুন',
    clearCart: 'কার্ট খালি করুন',
    remove: 'মুছুন',
  },
} as const;

export function CartScreen() {
  const router = useRouter();
  const { onScroll } = useTabBarScroll();
  const {
    items,
    totalItems,
    subtotal,
    deliveryFee,
    total,
    freeDeliveryThreshold,
    amountToFreeDelivery,
    updateQty,
    removeItem,
    clearCart,
  } = useCart();

  const [locale, setLocale] = useState<Locale>('en');
  const text = copy[locale];

  const freeDeliveryProgress = useMemo(() => {
    if (subtotal >= freeDeliveryThreshold) return 1;
    return Math.min(1, subtotal / freeDeliveryThreshold);
  }, [freeDeliveryThreshold, subtotal]);

  const renderCartItem = ({ item }: { item: CartItem }) => {
    return (
      <View style={styles.cartCard}>
        {/* Product Image */}
        <View style={styles.imageBox}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
          ) : (
            <Text style={styles.itemEmoji}>{item.emoji || '🛒'}</Text>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.itemInfo}>
          <Text numberOfLines={2} style={styles.itemName}>
            {item.name}
          </Text>
          <Text style={styles.itemUnit}>{item.unit}</Text>

          <View style={styles.itemPriceRow}>
            <Text style={styles.itemPrice}>৳{item.price}</Text>
            {item.originalPrice && item.originalPrice > item.price ? (
              <Text style={styles.itemOriginalPrice}>৳{item.originalPrice}</Text>
            ) : null}
          </View>

          <Pressable accessibilityRole="button" onPress={() => removeItem(item.id)} style={styles.removeButton}>
            <Text style={styles.removeText}>{text.remove}</Text>
          </Pressable>
        </View>

        {/* Quantity Controls & Line Total */}
        <View style={styles.itemActions}>
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              onPress={() => updateQty(item.id, -1)}
              style={styles.stepperButton}
              accessibilityLabel={`Decrease quantity of ${item.name}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <Text style={styles.quantityText}>{item.qty}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => updateQty(item.id, 1)}
              style={styles.stepperButton}
              accessibilityLabel={`Increase quantity of ${item.name}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.lineTotal}>৳{item.price * item.qty}</Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerBox}>
        {/* Header Title & Language Toggle */}
        <View style={styles.topRow}>
          <View>
            <Text accessibilityRole="header" style={styles.screenTitle}>{text.title}</Text>
            <Text style={styles.itemsCount}>{text.itemsCount(totalItems)}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={locale === 'en' ? 'Switch to Bengali' : 'Switch to English'}
            onPress={() => setLocale((prev) => (prev === 'en' ? 'bn' : 'en'))}
            style={styles.localeButton}
          >
            <Text style={styles.localeText}>{locale === 'en' ? 'বাংলা' : 'English'}</Text>
          </Pressable>
        </View>

        {/* Free Delivery Bar */}
        <View style={styles.deliveryProgressCard}>
          <View style={styles.deliveryProgressHeader}>
            <Text style={styles.deliveryProgressTitle}>
              {amountToFreeDelivery === 0
                ? text.freeDeliveryUnlocked
                : text.freeDeliveryAway(amountToFreeDelivery)}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(freeDeliveryProgress * 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (items.length === 0) return null;

    return (
      <View style={styles.footerBox}>
        {/* Order Summary Box */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>{text.orderSummary}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{text.subtotal}</Text>
            <Text style={styles.summaryValue}>৳{subtotal}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{text.deliveryFee}</Text>
            <Text
              style={[
                styles.summaryValue,
                deliveryFee === 0 && styles.freeDeliveryText,
              ]}
            >
              {deliveryFee === 0 ? text.free : `৳${deliveryFee}`}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{text.total}</Text>
            <Text style={styles.totalValue}>৳{total}</Text>
          </View>

          <Text style={styles.codNote}>{text.codNote}</Text>
        </View>

        {/* Checkout Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/checkout' as any)}
          style={({ pressed }) => [styles.checkoutButton, pressed && styles.pressedScale]}
        >
          <Text style={styles.checkoutButtonText}>
            {text.checkout} (৳{total})
          </Text>
        </Pressable>

        {/* Clear Cart Option */}
        <Pressable
          accessibilityRole="button"
          onPress={clearCart}
          style={({ pressed }) => [styles.clearCartButton, pressed && styles.pressedScale]}
        >
          <Text style={styles.clearCartText}>{text.clearCart}</Text>
        </Pressable>
      </View>
    );
  };

  if (items.length === 0) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>{text.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{text.emptyBody}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/(shop)')}
            style={({ pressed }) => [styles.startShoppingButton, pressed && styles.pressedScale]}
          >
            <Text style={styles.startShoppingText}>{text.startShopping}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={renderHeader}
        renderItem={renderCartItem}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  listContent: {
    paddingBottom: TAB_BAR_BOTTOM_CLEARANCE,
  },
  headerBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  itemsCount: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  localeButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  localeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  deliveryProgressCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  deliveryProgressHeader: {
    marginBottom: 8,
  },
  deliveryProgressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.line,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  imageBox: {
    width: 64,
    height: 64,
    backgroundColor: colors.paper,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemEmoji: {
    fontSize: 28,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
  },
  itemUnit: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  itemOriginalPrice: {
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  removeButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  removeText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepperButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  quantityText: {
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  footerBox: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  summaryHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  freeDeliveryText: {
    color: colors.green,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  codNote: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
    lineHeight: 16,
  },
  checkoutButton: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pressedScale: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  checkoutButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  clearCartButton: {
    alignItems: 'center',
    padding: 8,
  },
  clearCartText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  startShoppingButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  startShoppingText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
