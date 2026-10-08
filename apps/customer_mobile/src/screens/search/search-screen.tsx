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
  CatalogProduct,
  CatalogSort,
  fetchCatalog,
} from '../../services/catalog';
import { Locale } from '../../services/home';
import { useCart } from '../../state/cart-context';
import { useTabBarScroll } from '../../state/tab-bar-scroll-context';
import { colors } from '../../theme';

const copy = {
  en: {
    title: 'Search',
    placeholder: 'Search rice, oil, tea, snacks…',
    recentTitle: 'Recent Searches',
    popularTitle: 'Popular Searches',
    clearRecent: 'Clear',
    categoriesTitle: 'Browse Categories',
    resultsCount: (count: number) => `${count} result${count === 1 ? '' : 's'}`,
    noResults: 'No products found',
    noResultsBody: 'Try checking your spelling or searching for a more general term.',
    retry: 'Try Again',
    loading: 'Searching…',
    inStockOnly: 'In Stock Only',
    add: 'Add',
    added: 'Added',
    outOfStock: 'Out of Stock',
    back: 'Back',
  },
  bn: {
    title: 'অনুসন্ধান',
    placeholder: 'চাল, তেল, চা, নাস্তা খুঁজুন…',
    recentTitle: 'সাম্প্রতিক খোঁজ',
    popularTitle: 'জনপ্রিয় খোঁজ',
    clearRecent: 'মুছুন',
    categoriesTitle: 'ক্যাটাগরি ব্রাউজ করুন',
    resultsCount: (count: number) => `${count}টি ফলাফল`,
    noResults: 'কোনো পণ্য পাওয়া যায়নি',
    noResultsBody: 'বানান পরীক্ষা করুন অথবা অন্য কিছু দিয়ে খুঁজুন।',
    retry: 'আবার চেষ্টা করুন',
    loading: 'খোঁজা হচ্ছে…',
    inStockOnly: 'স্টকে আছে এমন',
    add: 'যোগ করুন',
    added: 'যোগ হয়েছে',
    outOfStock: 'স্টক শেষ',
    back: 'ফিরে যান',
  },
} as const;

const POPULAR_SEARCHES_EN = ['Rice', 'Cooking Oil', 'Eggs', 'Noodles', 'Tea & Coffee', 'Biscuits', 'Ice Cream', 'Snacks'];
const POPULAR_SEARCHES_BN = ['চাল', 'তেল', 'ডিম', 'নুডলস', 'চা ও কফি', 'বিস্কুট', 'আইসক্রিম', 'নাস্তা'];

const CATEGORY_SHORTCUTS = [
  { slug: 'cooking-essentials', en: 'Cooking Essentials', bn: 'রান্নার পণ্য', emoji: '🌾' },
  { slug: 'snacks', en: 'Snacks & Drinks', bn: 'নাস্তা ও পানীয়', emoji: '🍿' },
  { slug: 'tea-and-coffee', en: 'Tea & Coffee', bn: 'চা ও কফি', emoji: '☕' },
  { slug: 'biscuits-and-cookies', en: 'Biscuits & Cookies', bn: 'বিস্কুট ও কুকিজ', emoji: '🍪' },
  { slug: 'personal-care', en: 'Personal Care', bn: 'ব্যক্তিগত যত্ন', emoji: '🧼' },
  { slug: 'cleaning-supplies', en: 'Cleaning Supplies', bn: 'পরিচ্ছন্নতা', emoji: '🧹' },
];

const SORT_OPTIONS: { id: CatalogSort; enLabel: string; bnLabel: string }[] = [
  { id: 'best', enLabel: 'Featured', bnLabel: 'জনপ্রিয়' },
  { id: 'price-asc', enLabel: 'Price: Low', bnLabel: 'দাম: কম' },
  { id: 'price-desc', enLabel: 'Price: High', bnLabel: 'দাম: বেশি' },
  { id: 'name-asc', enLabel: 'A-Z', bnLabel: 'A-Z' },
];

export function SearchScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ q?: string }>();
  const initialQuery = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q || '';

  const { add } = useCart();
  const { onScroll } = useTabBarScroll();
  const [locale, setLocale] = useState<Locale>('en');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [sort, setSort] = useState<CatalogSort>('best');
  const [inStockOnly, setInStockOnly] = useState(false);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());
  const requestVersionRef = useRef(0);

  const text = copy[locale];
  const popularSearches = locale === 'bn' ? POPULAR_SEARCHES_BN : POPULAR_SEARCHES_EN;

  const performSearch = useCallback(
    (term: string) => {
      const clean = term.trim();
      setSearchQuery(clean);
      setActiveQuery(clean);
      if (!clean) {
        setProducts([]);
        setTotal(0);
        setHasMore(false);
        return;
      }
      if (!recentSearches.includes(clean)) {
        setRecentSearches((prev) => [clean, ...prev.filter((item) => item !== clean).slice(0, 4)]);
      }
    },
    [recentSearches],
  );

  const refresh = useCallback(async () => {
    if (!activeQuery) return;
    setRefreshing(true);
    setError(null);
    const version = ++requestVersionRef.current;
    try {
      const page = await fetchCatalog({
        locale,
        q: activeQuery,
        sort,
        inStockOnly,
        limit: 30,
        offset: 0,
      });
      if (requestVersionRef.current !== version) return;
      setProducts(page.items);
      setTotal(page.total);
      setHasMore(page.hasMore);
    } catch (cause) {
      if (requestVersionRef.current !== version) return;
      setError(cause instanceof Error ? cause.message : 'Search failed');
    } finally {
      if (requestVersionRef.current === version) {
        setRefreshing(false);
      }
    }
  }, [activeQuery, inStockOnly, locale, sort]);

  useEffect(() => {
    if (!activeQuery) {
      return;
    }

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
            q: activeQuery,
            sort,
            inStockOnly,
            limit: 30,
            offset: 0,
          },
          controller.signal,
        );
        if (!active || requestVersionRef.current !== version) return;
        setProducts(page.items);
        setTotal(page.total);
        setHasMore(page.hasMore);
        setError(null);
      } catch (cause) {
        if (!active || (cause instanceof Error && cause.name === 'AbortError')) return;
        if (requestVersionRef.current !== version) return;
        setError(cause instanceof Error ? cause.message : 'Search failed');
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
  }, [activeQuery, inStockOnly, locale, sort]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore || refreshing || !activeQuery) return;
    setLoadingMore(true);
    const version = requestVersionRef.current;
    try {
      const page = await fetchCatalog({
        locale,
        q: activeQuery,
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
      setLoadingMore(false);
    }
  }, [activeQuery, hasMore, inStockOnly, loading, loadingMore, locale, products.length, refreshing, sort]);

  const handleAddToCart = useCallback(
    (product: CatalogProduct) => {
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
    },
    [add],
  );

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
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} contentFit="cover" />
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
            style={({ pressed }) => [
              styles.addButton,
              isOutOfStock && styles.addButtonDisabled,
              isAdded && styles.addButtonSuccess,
              pressed && !isOutOfStock && styles.pressedScale,
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

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        {/* Top Header Row */}
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

        {/* Search Bar Input */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={text.placeholder}
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => performSearch(searchQuery)}
            returnKeyType="search"
            autoFocus={!initialQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setActiveQuery('');
              }}
              hitSlop={8}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          )}
          <Pressable onPress={() => performSearch(searchQuery)} style={styles.submitSearchButton}>
            <Text style={styles.submitSearchText}>Go</Text>
          </Pressable>
        </View>

        {/* When no query has been submitted yet: Show recent searches, popular searches, categories */}
        {!activeQuery && (
          <View style={styles.discoverySection}>
            {recentSearches.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeading}>{text.recentTitle}</Text>
                  <Pressable onPress={() => setRecentSearches([])}>
                    <Text style={styles.clearRecentText}>{text.clearRecent}</Text>
                  </Pressable>
                </View>
                <View style={styles.chipRow}>
                  {recentSearches.map((term) => (
                    <Pressable
                      key={term}
                      onPress={() => performSearch(term)}
                      style={styles.historyChip}
                    >
                      <Text style={styles.historyChipIcon}>🕒</Text>
                      <Text style={styles.chipText}>{term}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Searches */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>{text.popularTitle}</Text>
              <View style={styles.chipRow}>
                {popularSearches.map((term) => (
                  <Pressable
                    key={term}
                    onPress={() => performSearch(term)}
                    style={styles.popularChip}
                  >
                    <Text style={styles.popularChipIcon}>🔥</Text>
                    <Text style={styles.chipText}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Category Shortcuts */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>{text.categoriesTitle}</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORY_SHORTCUTS.map((cat) => (
                  <Pressable
                    key={cat.slug}
                    onPress={() =>
                      router.push({ pathname: '/category/[slug]', params: { slug: cat.slug } })
                    }
                    style={styles.categoryShortcutCard}
                  >
                    <Text style={styles.shortcutEmoji}>{cat.emoji}</Text>
                    <Text style={styles.shortcutName}>{locale === 'bn' ? cat.bn : cat.en}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Controls bar when searching */}
        {activeQuery.length > 0 && (
          <View style={styles.controlsBar}>
            <View style={styles.sortRow}>
              {SORT_OPTIONS.map((option) => {
                const isActive = sort === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setSort(option.id)}
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
                trackColor={{ false: colors.line, true: colors.greenSoft }}
                thumbColor={inStockOnly ? colors.green : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Error or result count */}
        {error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void refresh()} style={styles.retryButton}>
              <Text style={styles.retryText}>{text.retry}</Text>
            </Pressable>
          </View>
        ) : activeQuery ? (
          <View style={styles.resultsRow}>
            <Text style={styles.resultsCountText}>{text.resultsCount(total)}</Text>
          </View>
        ) : null}
      </View>
    );
  }, [
    activeQuery,
    error,
    inStockOnly,
    initialQuery,
    locale,
    performSearch,
    popularSearches,
    recentSearches,
    refresh,
    router,
    searchQuery,
    sort,
    text,
    total,
  ]);

  const renderEmpty = useMemo(() => {
    if (!activeQuery) return null;
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
        <Text style={styles.emptyEmoji}>🔎</Text>
        <Text style={styles.emptyTitle}>{text.noResults}</Text>
        <Text style={styles.emptyBody}>{text.noResultsBody}</Text>
      </View>
    );
  }, [activeQuery, loading, text]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: text.title, headerLargeTitle: true }} />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={products.length > 0 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={renderHeader}
        renderItem={renderProductItem}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.green} />
            </View>
          ) : null
        }
        refreshControl={
          activeQuery ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.green}
            />
          ) : undefined
        }
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
    paddingBottom: 110,
  },
  pressedScale: {
    transform: [{ scale: 0.96 }],
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  clearButton: {
    padding: 4,
    marginRight: 6,
  },
  clearText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '700',
  },
  submitSearchButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  submitSearchText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  discoverySection: {
    marginTop: 8,
    gap: 20,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  clearRecentText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  historyChipIcon: {
    fontSize: 12,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  popularChipIcon: {
    fontSize: 12,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryShortcutCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  shortcutEmoji: {
    fontSize: 22,
  },
  shortcutName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
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
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
