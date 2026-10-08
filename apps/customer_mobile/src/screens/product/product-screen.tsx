import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  fetchProductDetail,
  ProductDetailItem,
} from '../../services/product';
import { Locale } from '../../services/home';
import { useCart } from '../../state/cart-context';
import { colors } from '../../theme';

const copy = {
  en: {
    back: 'Back',
    inStock: 'In Stock · Ready for local delivery',
    outOfStock: 'Out of Stock',
    addToCart: 'Add to Cart',
    addedToCart: 'Added to Cart',
    quantity: 'Quantity',
    description: 'Product Details',
    related: 'You May Also Like',
    inspection: 'Pay after doorstep inspection',
    cod: 'Cash on Delivery in Chattogram',
    retry: 'Try Again',
    loading: 'Loading product details…',
    notFound: 'Product Not Found',
    notFoundBody: 'This product might have been moved or is currently unavailable.',
    brand: 'Brand:',
    sku: 'SKU:',
    add: 'Add',
    added: 'Added',
  },
  bn: {
    back: 'ফিরে যান',
    inStock: 'স্টকে আছে · দ্রুত হোম ডেলিভারি',
    outOfStock: 'স্টক শেষ',
    addToCart: 'কার্টে যোগ করুন',
    addedToCart: 'কার্টে যোগ হয়েছে',
    quantity: 'পরিমাণ',
    description: 'পণ্যের বিবরণ',
    related: 'আরও পছন্দের পণ্য',
    inspection: 'পণ্য দেখে ডেলিভারির পর পেমেন্ট',
    cod: 'চট্টগ্রামে ক্যাশ অন ডেলিভারি',
    retry: 'আবার চেষ্টা করুন',
    loading: 'পণ্যের তথ্য লোড হচ্ছে…',
    notFound: 'পণ্যটি পাওয়া যায়নি',
    notFoundBody: 'পণ্যটি সরানো হয়েছে অথবা এখন পাওয়া যাচ্ছে না।',
    brand: 'ব্র্যান্ড:',
    sku: 'এসকেইউ:',
    add: 'যোগ করুন',
    added: 'যোগ হয়েছে',
  },
} as const;

export function ProductDetailScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ id: string }>();
  const productId = Array.isArray(searchParams.id) ? searchParams.id[0] : searchParams.id;

  const { add } = useCart();
  const [locale, setLocale] = useState<Locale>('en');
  const [product, setProduct] = useState<ProductDetailItem | null>(null);
  const [related, setRelated] = useState<ProductDetailItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);
  const [relatedAddedIds, setRelatedAddedIds] = useState<Set<string>>(() => new Set());

  const text = copy[locale];

  const refresh = useCallback(async () => {
    if (!productId) return;
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchProductDetail(productId, locale);
      setProduct(data.product);
      setRelated(data.related);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load product');
    } finally {
      setRefreshing(false);
    }
  }, [locale, productId]);

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    void fetchProductDetail(productId, locale, controller.signal)
      .then((data) => {
        setProduct(data.product);
        setRelated(data.related);
        setError(null);
      })
      .catch((cause) => {
        if (cause instanceof Error && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Failed to load product');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [locale, productId]);

  const handleAddToCart = useCallback(() => {
    if (!product || product.stock <= 0) return;
    const qtyToAdd = Math.min(quantity, product.stock);
    if (qtyToAdd <= 0) return;
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
      qtyToAdd,
    );
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1800);
  }, [add, product, quantity]);

  const handleAddRelated = useCallback(
    (item: ProductDetailItem) => {
      add(item.id, {
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        unit: item.unit,
        imageUrl: item.imageUrl,
        emoji: item.emoji,
        stock: item.stock,
      });
      setRelatedAddedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      setTimeout(() => {
        setRelatedAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 1500);
    },
    [add],
  );

  const screenTitle = product?.name || text.description;

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>{text.loading}</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorTitle}>{text.notFound}</Text>
        <Text style={styles.errorBody}>{error || text.notFoundBody}</Text>
        <Pressable onPress={() => void refresh()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{text.retry}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← {text.back}</Text>
        </Pressable>
      </View>
    );
  }

  const isOutOfStock = product.stock <= 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: screenTitle, headerLargeTitle: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.green}
          />
        }
      >
        {/* Top bar with back and locale toggle */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.back}
            onPress={() => router.back()}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>← {text.back}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={locale === 'en' ? 'Switch to Bengali' : 'Switch to English'}
            onPress={() => setLocale((prev) => (prev === 'en' ? 'bn' : 'en'))}
            style={styles.localeButton}
          >
            <Text style={styles.localeText}>{locale === 'en' ? 'বাংলা' : 'English'}</Text>
          </Pressable>
        </View>

        {/* Hero Product Image */}
        <View style={styles.imageCard}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.heroImage}
              contentFit="contain"
              accessibilityLabel={product.name}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderEmoji}>{product.emoji || '🛒'}</Text>
            </View>
          )}
          {product.badge ? (
            <View style={styles.badgeTag}>
              <Text style={styles.badgeText}>{product.badge}</Text>
            </View>
          ) : null}
        </View>

        {/* Product Details Section */}
        <View style={styles.infoCard}>
          {/* Stock Tag */}
          <View style={[styles.stockTag, isOutOfStock ? styles.stockTagOut : styles.stockTagIn]}>
            <Text style={[styles.stockText, isOutOfStock ? styles.stockTextOut : styles.stockTextIn]}>
              {isOutOfStock ? text.outOfStock : text.inStock}
            </Text>
          </View>

          {/* Product Title */}
          <Text style={styles.productTitle} accessibilityRole="header">{product.name}</Text>
          <Text style={styles.unitText}>{product.unit}</Text>

          {/* Price Box */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>৳{product.price}</Text>
            {product.originalPrice && product.originalPrice > product.price ? (
              <View style={styles.discountRow}>
                <Text style={styles.originalPriceText}>৳{product.originalPrice}</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>
                    Save ৳{product.originalPrice - product.price}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Quantity Controls & Add to Cart */}
          <View style={styles.actionRow}>
            <View
              style={styles.stepper}
              accessibilityRole="adjustable"
              accessibilityValue={{ min: 1, max: product.stock, now: quantity, text: `${quantity} ${product.unit}` }}
            >
              <Pressable
                disabled={quantity <= 1 || isOutOfStock}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                accessibilityHint={`Current quantity is ${quantity}`}
                style={[styles.stepperButton, (quantity <= 1 || isOutOfStock) && styles.stepperButtonDisabled]}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>
              <Text
                style={styles.quantityText}
                accessibilityLabel={`Quantity ${quantity}`}
                accessibilityLiveRegion="polite"
              >
                {quantity}
              </Text>
              <Pressable
                disabled={quantity >= product.stock || isOutOfStock}
                onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                accessibilityHint={`Current quantity is ${quantity}`}
                style={[styles.stepperButton, (quantity >= product.stock || isOutOfStock) && styles.stepperButtonDisabled]}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>

            <Pressable
              disabled={isOutOfStock}
              accessibilityRole="button"
              accessibilityLabel={`${text.addToCart} ${product.name}`}
              onPress={handleAddToCart}
              style={[
                styles.mainAddButton,
                isOutOfStock && styles.mainAddButtonDisabled,
                isAdded && styles.mainAddButtonSuccess,
              ]}
            >
              <Text style={[styles.mainAddButtonText, isAdded && styles.mainAddButtonTextSuccess]}>
                {isAdded ? `✓ ${text.addedToCart}` : text.addToCart}
              </Text>
            </Pressable>
          </View>

          {/* Trust Guarantees */}
          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <Text style={styles.trustEmoji}>🔍</Text>
              <Text style={styles.trustText}>{text.inspection}</Text>
            </View>
            <View style={styles.trustItem}>
              <Text style={styles.trustEmoji}>💵</Text>
              <Text style={styles.trustText}>{text.cod}</Text>
            </View>
          </View>

          {/* Description block */}
          {product.description ? (
            <View style={styles.descriptionBlock}>
              <Text style={styles.descriptionHeading} accessibilityRole="header">{text.description}</Text>
              <Text style={styles.descriptionBody}>{product.description}</Text>
            </View>
          ) : null}

          {/* Brand / SKU info */}
          {(product.brand || product.sku) && (
            <View style={styles.metaRow}>
              {product.brand && (
                <Text style={styles.metaText}>
                  <Text style={styles.metaLabel}>{text.brand} </Text>
                  {product.brand}
                </Text>
              )}
              {product.sku && (
                <Text style={styles.metaText}>
                  <Text style={styles.metaLabel}>{text.sku} </Text>
                  {product.sku}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Related Products Carousel */}
        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle} accessibilityRole="header">{text.related}</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={related}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.relatedList}
              renderItem={({ item }) => {
                const itemAdded = relatedAddedIds.has(item.id);
                const outOfStock = item.stock <= 0;
                return (
                  <View style={styles.relatedCard}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
                    >
                      <View style={styles.relatedImageContainer}>
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.relatedImage}
                            contentFit="cover"
                            accessibilityLabel={item.name}
                          />
                        ) : (
                          <Text style={styles.relatedEmoji}>{item.emoji || '🛒'}</Text>
                        )}
                      </View>
                      <Text numberOfLines={2} style={styles.relatedName}>{item.name}</Text>
                      <Text style={styles.relatedPrice}>৳{item.price}</Text>
                    </Pressable>
                    <Pressable
                      disabled={outOfStock}
                      onPress={() => handleAddRelated(item)}
                      style={[styles.relatedAddButton, itemAdded && styles.relatedAddButtonSuccess]}
                    >
                      <Text style={[styles.relatedAddText, itemAdded && styles.relatedAddTextSuccess]}>
                        {itemAdded ? text.added : text.add}
                      </Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  navButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
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
  imageCard: {
    marginHorizontal: 16,
    height: 280,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '90%',
    height: '90%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  badgeTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
    textTransform: 'uppercase',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  stockTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  stockTagIn: {
    backgroundColor: colors.greenSoft,
  },
  stockTagOut: {
    backgroundColor: '#FDF2F0',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stockTextIn: {
    color: colors.green,
  },
  stockTextOut: {
    color: colors.danger,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 28,
  },
  unitText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginVertical: 14,
  },
  priceText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.green,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPriceText: {
    fontSize: 16,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  saveBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
  },
  stepperButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  quantityText: {
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  mainAddButton: {
    flex: 1,
    height: 44,
    backgroundColor: colors.ink,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainAddButtonDisabled: {
    backgroundColor: colors.line,
  },
  mainAddButtonSuccess: {
    backgroundColor: colors.green,
  },
  mainAddButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  mainAddButtonTextSuccess: {
    color: '#FFFFFF',
  },
  trustGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    gap: 12,
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustEmoji: {
    fontSize: 18,
  },
  trustText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  descriptionBlock: {
    marginTop: 14,
  },
  descriptionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  descriptionBody: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  metaText: {
    fontSize: 12,
    color: colors.ink,
  },
  metaLabel: {
    fontWeight: '700',
    color: colors.muted,
  },
  relatedSection: {
    marginTop: 20,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  relatedList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  relatedCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 8,
    justifyContent: 'space-between',
  },
  relatedImageContainer: {
    width: '100%',
    height: 90,
    backgroundColor: colors.paper,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  relatedImage: {
    width: '100%',
    height: '100%',
  },
  relatedEmoji: {
    fontSize: 32,
  },
  relatedName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 16,
    minHeight: 32,
  },
  relatedPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.green,
    marginTop: 4,
    marginBottom: 8,
  },
  relatedAddButton: {
    backgroundColor: colors.ink,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  relatedAddButtonSuccess: {
    backgroundColor: colors.green,
  },
  relatedAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  relatedAddTextSuccess: {
    color: '#FFFFFF',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: colors.paper,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.muted,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  errorBody: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  backLink: {
    padding: 6,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
  },
});
