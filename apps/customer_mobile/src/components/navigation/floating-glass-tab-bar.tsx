import { useRouter } from 'expo-router';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '../../state/cart-context';
import { useTabBarScroll } from '../../state/tab-bar-scroll-context';
import { colors } from '../../theme';

export interface FloatingGlassTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<string, any>;
  navigation: {
    navigate: (name: string) => void;
  };
}

export function FloatingGlassTabBar({ state, navigation }: FloatingGlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { totalItems } = useCart();
  const { tabBarTranslateY } = useTabBarScroll();

  const currentRouteName = state.routes[state.index]?.name;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: Math.max(16, insets.bottom + 8),
          transform: [{ translateY: tabBarTranslateY }],
        },
      ]}
    >
      <View style={styles.islandContainer}>
        {/* Luminous top sheen reflecting Apple liquid glass material */}
        <View style={styles.glassSheen} />

        {/* 1. Home */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Home"
          accessibilityState={{ selected: currentRouteName === '(home)' }}
          onPress={() => navigation.navigate('(home)')}
          style={({ pressed }) => [
            styles.tabItem,
            pressed && styles.tabItemPressed,
            currentRouteName === '(home)' && styles.tabItemActive,
          ]}
        >
          <Text style={[styles.tabIcon, currentRouteName === '(home)' && styles.tabIconActive]}>
            🏠
          </Text>
          <Text style={[styles.tabLabel, currentRouteName === '(home)' && styles.tabLabelActive]}>
            Home
          </Text>
          {currentRouteName === '(home)' && <View style={styles.activeDot} />}
        </Pressable>

        {/* 2. Shop */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Shop"
          accessibilityState={{ selected: currentRouteName === '(shop)' }}
          onPress={() => navigation.navigate('(shop)')}
          style={({ pressed }) => [
            styles.tabItem,
            pressed && styles.tabItemPressed,
            currentRouteName === '(shop)' && styles.tabItemActive,
          ]}
        >
          <Text style={[styles.tabIcon, currentRouteName === '(shop)' && styles.tabIconActive]}>
            🛍️
          </Text>
          <Text style={[styles.tabLabel, currentRouteName === '(shop)' && styles.tabLabelActive]}>
            Shop
          </Text>
          {currentRouteName === '(shop)' && <View style={styles.activeDot} />}
        </Pressable>

        {/* 3. Center Cart Button (Floating Action Island) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cart with ${totalItems} items`}
          accessibilityState={{ selected: currentRouteName === '(cart)' }}
          onPress={() => navigation.navigate('(cart)')}
          style={({ pressed }) => [
            styles.centerCartButton,
            pressed && styles.centerCartButtonPressed,
            currentRouteName === '(cart)' && styles.centerCartButtonActive,
          ]}
        >
          <Text style={styles.centerCartIcon}>🛒</Text>
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
            </View>
          )}
        </Pressable>

        {/* 4. Wishlist */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wishlist"
          onPress={() => router.push('/wishlist')}
          style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
        >
          <Text style={styles.tabIcon}>❤️</Text>
          <Text style={styles.tabLabel}>Saved</Text>
        </Pressable>

        {/* 5. Account / Menu with Badge */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account and Menu"
          accessibilityState={{ selected: currentRouteName === '(account)' }}
          onPress={() => navigation.navigate('(account)')}
          style={({ pressed }) => [
            styles.tabItem,
            pressed && styles.tabItemPressed,
            currentRouteName === '(account)' && styles.tabItemActive,
          ]}
        >
          <View style={styles.menuIconWrapper}>
            <Text style={[styles.tabIcon, currentRouteName === '(account)' && styles.tabIconActive]}>
              👤
            </Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>9+</Text>
            </View>
          </View>
          <Text style={[styles.tabLabel, currentRouteName === '(account)' && styles.tabLabelActive]}>
            Menu
          </Text>
          {currentRouteName === '(account)' && <View style={styles.activeDot} />}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 99,
  },
  islandContainer: {
    width: '100%',
    maxWidth: 440,
    height: 64,
    borderRadius: 34,
    backgroundColor: 'rgba(11, 11, 13, 0.90)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.42,
        shadowRadius: 18,
        elevation: 16,
      },
    }),
  },
  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 52,
    position: 'relative',
  },
  tabItemPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
  tabItemActive: {},
  tabIcon: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  tabIconActive: {
    color: colors.accent,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.60)',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  centerCartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(240, 196, 68, 0.4)',
      } as any,
      default: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  centerCartButtonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  centerCartButtonActive: {
    backgroundColor: '#ffd868',
  },
  centerCartIcon: {
    fontSize: 22,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E34234',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0B0B0D',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  menuIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#E34234',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#0B0B0D',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
