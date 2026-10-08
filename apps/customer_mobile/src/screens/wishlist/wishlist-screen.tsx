import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Locale } from '../../services/home';
import { useCart } from '../../state/cart-context';
import { useTabBarScroll } from '../../state/tab-bar-scroll-context';
import { useWishlist } from '../../state/wishlist-context';
import { colors } from '../../theme';

const copy = {
  en: {
    title: 'My Wishlist',
    itemsCount: (count: number) => `${count} item${count === 1 ? '' : 's'}`,
    emptyTitle: 'Your wishlist is empty',
    emptySubtitle: 'Save products you love so you can easily order them anytime.',
    startShopping: 'Explore Catalog',
    addToCart: 'Add to Cart',
    addedToCart: '✓ Added',
    outOfStock: 'Out of Stock',
    remove: 'Remove',
  },
  bn: {
    title: 'পছন্দের তালিকা',
    itemsCount: (count: number) => `${count}টি পণ্য`,
    emptyTitle: 'পছন্দের তালিকা খালি',
    emptySubtitle: 'আপনার পছন্দের পণ্যগুলো এখানে সেভ করে রাখুন যাতে সহজে কিনতে পারেন।',
    startShopping: 'পণ্য দেখুন',
    addToCart: 'কার্টে যোগ করুন',
    addedToCart: '✓ যোগ হয়েছে',
    outOfStock: 'স্টক শেষ',
    remove: 'মুছুন',
  },
} as const;

export function WishlistScreen() {
  const router = useRouter();
  const { wishlist, toggleWishlist } = useWishlist();
  const { add } = useCart();
  const { onScroll } = useTabBarScroll();
  const [locale, setLocale] = useState<Locale>('en');
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());
  const t = copy[locale];

  const handleAddToCart = (product: any) => {
    if (typeof product.stock === 'number' && product.stock <= 0) return;
    add(
      product.id,
      {
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        unit: product.unit,
        imageUrl: product.imageUrl,
        emoji: product.emoji,
        stock: product.stock,
      },
      1
    );
    setAddedIds((prev) => new Set([...prev, product.id]));
  };

  return (
    <View style={styles.screen}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.screenTitle} accessibilityRole="header">{t.title}</Text>
          <Text style={styles.subtitle}>{t.itemsCount(wishlist.length)}</Text>
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

      <FlatList
        data={wishlist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>❤️</Text>
            <Text style={styles.emptyTitle} accessibilityRole="header">{t.emptyTitle}</Text>
            <Text style={styles.emptySubtitle}>{t.emptySubtitle}</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressedScale]}
              onPress={() => router.replace('/(tabs)/(shop)' as any)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>{t.startShopping}</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const isAdded = addedIds.has(item.id);
          const isOutOfStock = typeof item.stock === 'number' && item.stock <= 0;

          return (
            <View style={styles.itemCard}>
              <Pressable
                style={styles.itemThumb}
                onPress={() =>
                  router.push({
                    pathname: '/product/[id]' as any,
                    params: { id: item.id },
                  })
                }
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.itemImage}
                    contentFit="contain"
                    accessibilityLabel={item.name}
                  />
                ) : (
                  <Text style={styles.itemEmoji} accessibilityLabel={item.name}>{item.emoji || '🛒'}</Text>
                )}
              </Pressable>

              <View style={styles.itemInfo}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/product/[id]' as any,
                      params: { id: item.id },
                    })
                  }
                >
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
                <Text style={styles.itemPrice}>
                  ৳{item.price}{' '}
                  <Text style={styles.itemUnit}>/ {item.unit}</Text>
                </Text>

                <View style={styles.actionsRow}>
                  <Pressable
                    disabled={isOutOfStock}
                    style={({ pressed }) => [
                      styles.cartButton,
                      isOutOfStock ? styles.cartButtonDisabled : null,
                      isAdded ? styles.cartButtonAdded : null,
                      pressed && !isOutOfStock && styles.pressedScale,
                    ]}
                    onPress={() => handleAddToCart(item)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isOutOfStock }}
                    accessibilityLabel={
                      isOutOfStock
                        ? `${item.name} ${t.outOfStock}`
                        : `${isAdded ? t.addedToCart : t.addToCart} ${item.name}`
                    }
                  >
                    <Text
                      style={[
                        styles.cartButtonText,
                        isOutOfStock ? styles.cartButtonTextDisabled : null,
                        isAdded ? styles.cartButtonTextAdded : null,
                      ]}
                    >
                      {isOutOfStock ? t.outOfStock : isAdded ? t.addedToCart : t.addToCart}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressedScale]}
                    onPress={() => toggleWishlist(item)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.removeButtonText}>{t.remove}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
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
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  pressedScale: {
    transform: [{ scale: 0.96 }],
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.deepNight,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
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
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 20,
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
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepNight,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  itemThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
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
    fontSize: 32,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepNight,
    fontVariant: ['tabular-nums'],
  },
  itemUnit: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '400',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cartButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cartButtonAdded: {
    backgroundColor: colors.greenSoft,
  },
  cartButtonDisabled: {
    backgroundColor: colors.line,
    opacity: 0.6,
  },
  cartButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.deepNight,
  },
  cartButtonTextDisabled: {
    color: colors.muted,
  },
  cartButtonTextAdded: {
    color: colors.green,
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  removeButtonText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
});
