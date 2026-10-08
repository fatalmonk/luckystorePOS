import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Locale, resolveApiBaseUrl } from '../../services/home';
import { MobileOrderDto } from '../../services/orders';
import { useAuth } from '../../state/auth-context';
import { useTabBarScroll } from '../../state/tab-bar-scroll-context';
import { colors } from '../../theme';

const copy = {
  en: {
    title: 'Order History',
    guestTitle: 'Sign in to view orders',
    guestSubtitle: 'Your verified account orders will appear here once you sign in.',
    signIn: 'Sign In',
    emptyTitle: 'No orders yet',
    emptySubtitle: 'When you place orders while signed in, they will show up here.',
    startShopping: 'Start Shopping',
    orderNumber: 'Order #',
    placedOn: 'Placed on',
    itemsCount: (count: number) => `${count} item${count === 1 ? '' : 's'}`,
    total: 'Total',
    viewDetails: 'View Details →',
  },
  bn: {
    title: 'পূর্বের অর্ডারসমূহ',
    guestTitle: 'অর্ডার দেখতে লগইন করুন',
    guestSubtitle: 'লগইন করার পর আপনার অ্যাকাউন্টের সকল অর্ডার এখানে দেখা যাবে।',
    signIn: 'লগইন করুন',
    emptyTitle: 'কোনো অর্ডার নেই',
    emptySubtitle: 'লগইন অবস্থায় অর্ডার করলে তা এখানে সংরক্ষিত থাকবে।',
    startShopping: 'কেনাকাটা শুরু করুন',
    orderNumber: 'অর্ডার #',
    placedOn: 'অর্ডারের তারিখ',
    itemsCount: (count: number) => `${count}টি পণ্য`,
    total: 'সর্বমোট',
    viewDetails: 'বিস্তারিত দেখুন →',
  },
} as const;

export function OrdersScreen() {
  const router = useRouter();
  const { token, isLoggedIn } = useAuth();
  const { onScroll } = useTabBarScroll();
  const [locale, setLocale] = useState<Locale>('en');
  const t = copy[locale];

  const [orders, setOrders] = useState<MobileOrderDto[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!token) {
      return;
    }
    setRefreshing(true);
    try {
      const baseUrl = resolveApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/mobile/v1/orders`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setOrders(data.orders || []);
      }
    } catch {
      // Ignored on background refresh
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      return;
    }
    const controller = new AbortController();
    const baseUrl = resolveApiBaseUrl();
    fetch(`${baseUrl}/api/mobile/v1/orders`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.orders) {
          setOrders(data.orders);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [isLoggedIn, token]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.guestCard}>
          <Text style={styles.guestEmoji}>📦</Text>
          <Text style={styles.guestTitle}>{t.guestTitle}</Text>
          <Text style={styles.guestSubtitle}>{t.guestSubtitle}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/login' as any)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>{t.signIn}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>{t.title}</Text>
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
        data={orders}
        keyExtractor={(item) => item.id || item.orderNumber}
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🛍️</Text>
            <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
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
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.orderCard, pressed && styles.pressedScale]}
            onPress={() =>
              router.push({
                pathname: '/order/[number]' as any,
                params: { number: item.orderNumber },
              })
            }
            accessibilityRole="button"
          >
            <View style={styles.orderCardHeader}>
              <View>
                <Text selectable style={styles.orderNumberText}>
                  {t.orderNumber}
                  {item.orderNumber}
                </Text>
                {item.createdAt ? (
                  <Text style={styles.orderDateText}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.orderCardDivider} />

            <View style={styles.orderCardFooter}>
              <Text style={styles.itemsCountText}>
                {t.itemsCount(item.items.length)}
              </Text>
              <View style={styles.totalCol}>
                <Text style={styles.totalLabel}>{t.total}:</Text>
                <Text style={styles.totalValue}>৳{item.total}</Text>
              </View>
            </View>
          </Pressable>
        )}
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
    transform: [{ scale: 0.98 }],
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
  centerContainer: {
    flex: 1,
    backgroundColor: colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  guestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    width: '100%',
    maxWidth: 360,
  },
  guestEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepNight,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
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
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepNight,
    fontVariant: ['tabular-nums'],
  },
  orderDateText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.deepNight,
  },
  orderCardDivider: {
    height: 1,
    backgroundColor: colors.line,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCountText: {
    fontSize: 12,
    color: colors.muted,
  },
  totalCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepNight,
    fontVariant: ['tabular-nums'],
  },
});
