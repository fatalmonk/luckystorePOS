import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CatalogCategory,
  CatalogProduct,
  CatalogSort,
  fetchCatalog,
} from '../../services/catalog';
import { Locale } from '../../services/home';
import { useCart } from '../../state/cart-context';
import { colors } from '../../theme';

const copy = {
  en: {
    back: 'Back',
    searchPlaceholder: 'Search in this category…',
    inStockOnly: 'In Stock Only',
    sortBy: 'Sort:',
    sortBest: 'Featured',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    sortNameAsc: 'A-Z',
    add: 'Add',
    added: 'Added',
    outOfStock: 'Out of Stock',
    onSale: 'Sale',
    noProducts: 'No products in this category',
    noProductsBody: 'Try searching for something else or adjusting your filters.',
    clearFilters: 'Clear Filters',
    retry: 'Try Again',
    loading: 'Loading category products…',
    resultsCount: (count: number) => `${count} product${count === 1 ? '' : 's'}`,
    allCategories: 'All Categories',
  },
  bn: {
    back: 'ফিরে যান',
    searchPlaceholder: 'এই ক্যাটাগরিতে খুঁজুন…',
    inStockOnly: 'স্টকে আছে এমন',
    sortBy: 'বাছাই:',
    sortBest: 'জনপ্রিয়',
    sortPriceAsc: 'দাম: কম থেকে বেশি',
    sortPriceDesc: 'দাম: বেশি থেকে কম',
    sortNameAsc: 'নাম (অ-ক্ষর)',
    add: 'যোগ করুন',
    added: 'যোগ হয়েছে',
    outOfStock: 'স্টক শেষ',
    onSale: 'ছাড়',
    noProducts: 'এই ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি',
    noProductsBody: 'অন্য কিছু দিয়ে খুঁজুন অথবা ফিল্টার পরিবর্তন করুন।',
    clearFilters: 'ফিল্টার মুছুন',
    retry: 'আবার চেষ্টা করুন',
    loading: 'ক্যাটাগরি পণ্য লোড হচ্ছে…',
    resultsCount: (count: number) => `${count}টি পণ্য`,
    allCategories: 'সব ক্যাটাগরি',
  },
} as const;

const SORT_OPTIONS: { id: CatalogSort; enLabel: string; bnLabel: string }[] = [
  { id: 'best', enLabel: 'Featured', bnLabel: 'জনপ্রিয়' },
  { id: 'price-asc', enLabel: 'Price: Low', bnLabel: 'দাম: কম' },
  { id: 'price-desc', enLabel: 'Price: High', bnLabel: 'দাম: বেশি' },
  { id: 'name-asc', enLabel: 'A-Z', bnLabel: 'A-Z' },
];

export function CategoryDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const categorySlug = Array.isArray(slug) ? slug[0] : slug || 'all';

  const { add } = useCart();
  const [locale, setLocale] = useState<Locale>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<CatalogSort>('best');
  const [inStockOnly, setInStockOnly] = useState(false);

  const [categoryInfo, setCategoryInfo] = useState<{ slug: string; name: string; emoji: string } | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());

  const requestVersionRef = useRef(0);
  const text = copy[locale];

  const refresh = useCallback(async () => {
    const version = ++requestVersionRef.current;
    setRefreshing(true);
    setError(null);
    try {
      const page = await fetchCatalog({
        locale,
        category: categorySlug,
        q: searchQuery.trim() || undefined,
        sort,
        inStockOnly,
        limit: 30,
        offset: 0,
      });
      if (requestVersionRef.current !== version) return;
      setCategories(page.categories);
      setProducts(page.items);
      setTotal(page.total);
      setHasMore(page.hasMore);
      if (page.category) {
        setCategoryInfo(page.category);
      }
    } catch (cause) {
      if (requestVersionRef.current !== version) return;
      setError(cause instanceof Error ? cause.message : 'Failed to load category');
    } finally {
      if (requestVersionRef.current === version) {
        setRefreshing(false);
      }
    }
  }, [categorySlug, inStockOnly, locale, searchQuery, sort]);

  useEffect(() => {
    let active = true;
    const version = ++requestVersionRef.current;
    const controller = new AbortController();

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const page = await fetchCatalog(
          {
            locale,
            category: categorySlug,
            q: searchQuery.trim() || undefined,
            sort,
            inStockOnly,
            limit: 30,
            offset: 0,
          },
          controller.signal,
        );
        if (!active || requestVersionRef.current !== version) return;
        setCategories(page.categories);
        setProducts(page.items);
        setTotal(page.total);
        setHasMore(page.hasMore);
        if (page.category) {
          setCategoryInfo(page.category);
        }
        setError(null);
      } catch (cause) {
        if (!active || (cause instanceof Error && cause.name === 'AbortError')) return;
        if (requestVersionRef.current !== version) return;
        setError(cause instanceof Error ? cause.message : 'Failed to load category');
      } finally {
        if (active && requestVersionRef.current === version) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [categorySlug, inStockOnly, locale, searchQuery, sort]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore || refreshing) return;
    setLoadingMore(true);
    const version = requestVersionRef.current;
    try {
      const page = await fetchCatalog({
        locale,
        category: categorySlug,
        q: searchQuery.trim() || undefined,
        sort,
        inStockOnly,
        limit: 30,
        offset: products.length,
      });
      if (requestVersionRef.current !== version) return;
      setProducts((prev) => [...prev, ...page.items]);
      setTotal(page.total);
      setHasMore(page.hasMore);
    } catch {
      // non-fatal pagination error
    } finally {
      if (requestVersionRef.current === version) {
        setLoadingMore(false);
      }
    }
  }, [categorySlug, hasMore, inStockOnly, loading, loadingMore, locale, products.length, refreshing, searchQuery, sort]);

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleAddToCart = useCallback((product: CatalogProduct) => {
    add(product.id, {
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      emoji: product.emoji,
      stock: product.stock,
    });
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(product.id);
      return next;
    });
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1500);
  }, [add]);

  const currentTitle = useMemo(() => {
    if (categoryInfo) {
      return `${categoryInfo.emoji} ${categoryInfo.name}`;
    }
    const matched = categories.find((c) => c.slug === categorySlug);
    if (matched) {
      return `${matched.emoji} ${matched.name}`;
    }
    return categorySlug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }, [categories, categoryInfo, categorySlug]);

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        {/* Top bar with back button & language switcher */}
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.back}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← {text.back}</Text>
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

        {/* Category Hero Title Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.categoryTitle} accessibilityRole="header">{currentTitle}</Text>
        </View>

        {/* In-category Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={text.searchPlaceholder}
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Sort & In-Stock Controls Bar */}
        <View style={styles.controlsBar}>
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((option) => {
              const isActive = sort === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSort(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={[styles.sortChip, isActive && styles.sortChipActive]}
                >
                  <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                    {locale === 'bn' ? option.bnLabel : option.enLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.stockToggleRow}>
            <Text style={styles.stockToggleLabel}>{text.inStockOnly}</Text>
            <Switch
              value={inStockOnly}
              onValueChange={setInStockOnly}
              accessibilityLabel={text.inStockOnly}
              trackColor={{ false: colors.line, true: colors.greenSoft }}
              thumbColor={inStockOnly ? colors.green : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Error Banner or Results Count */}
        {error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void refresh()} style={styles.retryButton}>
              <Text style={styles.retryText}>{text.retry}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.resultsRow}>
            <Text style={styles.resultsCountText}>{text.resultsCount(total)}</Text>
          </View>
        )}
      </View>
    );
  }, [
    currentTitle,
    error,
    inStockOnly,
    locale,
    refresh,
    router,
    searchQuery,
    sort,
    text,
    total,
  ]);

  const renderProductItem = useCallback(
    ({ item }: { item: CatalogProduct }) => {
      const isAdded = addedIds.has(item.id);
      const isOutOfStock = item.stock <= 0;

      return (
        <View style={styles.productCard}>
          <Pressable
            onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
            style={styles.productCardPressable}
          >
            <View style={styles.imageContainer}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.productImage}
                  contentFit="cover"
                  accessibilityLabel={item.name}
                  alt={item.name}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderEmoji}>{item.emoji || '🛒'}</Text>
                </View>
              )}
              {item.badge ? (
                <View style={styles.badgeTag}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
              {isOutOfStock ? (
                <View style={styles.outOfStockOverlay}>
                  <Text style={styles.outOfStockText}>{text.outOfStock}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.productDetails}>
              <Text numberOfLines={2} style={styles.productName}>
                {item.name}
              </Text>
              <Text style={styles.productUnit}>{item.unit}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceText}>৳{item.price}</Text>
                {item.originalPrice && item.originalPrice > item.price ? (
                  <Text style={styles.originalPriceText}>৳{item.originalPrice}</Text>
                ) : null}
              </View>
            </View>
          </Pressable>

          <Pressable
            disabled={isOutOfStock}
            accessibilityRole="button"
            accessibilityLabel={`${text.add} ${item.name}`}
            onPress={() => handleAddToCart(item)}
            style={[
              styles.addButton,
              isOutOfStock && styles.addButtonDisabled,
              isAdded && styles.addButtonSuccess,
            ]}
          >
            <Text style={[styles.addButtonText, isAdded && styles.addButtonTextSuccess]}>
              {isAdded ? text.added : text.add}
            </Text>
          </Pressable>
        </View>
      );
    },
    [addedIds, handleAddToCart, router, text],
  );

  const renderEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>{text.loading}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📦</Text>
        <Text style={styles.emptyTitle}>{text.noProducts}</Text>
        <Text style={styles.emptyBody}>{text.noProductsBody}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSearchQuery('');
            setInStockOnly(false);
            setSort('best');
          }}
          style={styles.clearFiltersButton}
        >
          <Text style={styles.clearFiltersButtonText}>{text.clearFilters}</Text>
        </Pressable>
      </View>
    );
  }, [loading, text]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: currentTitle, headerLargeTitle: true }} />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={products.length > 0 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={renderHeader}
        renderItem={renderProductItem}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  listContent: {
    paddingBottom: 110,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  backButtonText: {
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
  heroBanner: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '700',
  },
  controlsBar: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
    gap: 10,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.paper,
  },
  sortChipActive: {
    backgroundColor: colors.greenSoft,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  sortChipTextActive: {
    color: colors.green,
    fontWeight: '700',
  },
  stockToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  stockToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  resultsRow: {
    paddingVertical: 4,
  },
  resultsCountText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#FDF2F0',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  retryButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  productCardPressable: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: colors.paper,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 42,
  },
  badgeTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.ink,
    textTransform: 'uppercase',
  },
  outOfStockOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11, 11, 13, 0.75)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  productDetails: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
    minHeight: 36,
  },
  productUnit: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  originalPriceText: {
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  addButton: {
    backgroundColor: colors.ink,
    paddingVertical: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.line,
  },
  addButtonSuccess: {
    backgroundColor: colors.green,
  },
  addButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  addButtonTextSuccess: {
    color: '#FFFFFF',
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.muted,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  clearFiltersButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
