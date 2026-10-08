import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/auth-context';
import { useTabBarScroll } from '../../state/tab-bar-scroll-context';
import { colors } from '../../theme';

export function AppDrawer() {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.88, 380);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const { isDrawerOpen, closeDrawer } = useTabBarScroll();

  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDrawerOpen) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 75,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -drawerWidth,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isDrawerOpen, drawerWidth, translateX, backdropOpacity]);

  if (!isDrawerOpen) return null;

  const handleNavigate = (path: string, params?: Record<string, any>) => {
    closeDrawer();
    setTimeout(() => {
      if (params) {
        router.push({ pathname: path as any, params });
      } else {
        router.push(path as any);
      }
    }, 150);
  };

  return (
    <Modal
      transparent
      visible={isDrawerOpen}
      animationType="none"
      onRequestClose={closeDrawer}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View
        style={styles.container}
        accessibilityViewIsModal={true}
        aria-modal={true}
        {...({ role: 'dialog' } as any)}
        accessibilityLabel="Navigation menu"
      >
        {/* Backdrop Scrim */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu overlay"
            style={StyleSheet.absoluteFill}
            onPress={closeDrawer}
          />
        </Animated.View>

        {/* Drawer Panel */}
        <Animated.View
          style={[
            styles.drawerPanel,
            {
              width: drawerWidth,
              paddingTop: Math.max(16, insets.top),
              paddingBottom: Math.max(20, insets.bottom + 12),
              transform: [{ translateX }],
            },
          ]}
        >
          {/* Header Profile Identity */}
          <View style={styles.header}>
            <View style={styles.headerProfile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>🛍️</Text>
              </View>
              <View style={styles.profileTextContainer}>
                <Text numberOfLines={1} style={styles.profileTitle}>
                  {isLoggedIn && user?.name ? user.name : 'Lucky Store - Est. 1947'}
                </Text>
                <Text numberOfLines={1} style={styles.profileSubtitle}>
                  {isLoggedIn ? user?.email : 'Chawkbazar, Chattogram'}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              onPress={closeDrawer}
              style={styles.closeButton}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Section: Your shortcuts */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Your shortcuts</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shortcutsRow}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Category Snacks"
                  onPress={() => handleNavigate('/category/[slug]', { slug: 'snacks' })}
                  style={styles.shortcutCard}
                >
                  <View style={[styles.shortcutIconFrame, { backgroundColor: '#E34234' }]}>
                    <Text style={styles.shortcutEmoji}>🥨</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.shortcutLabel}>
                    Snacks
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Category Dairy and Eggs"
                  onPress={() => handleNavigate('/category/[slug]', { slug: 'dairy-and-eggs' })}
                  style={styles.shortcutCard}
                >
                  <View style={[styles.shortcutIconFrame, { backgroundColor: '#F0C444' }]}>
                    <Text style={styles.shortcutEmoji}>🥛</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.shortcutLabel}>
                    Dairy & Eggs
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Category Tea and Coffee"
                  onPress={() => handleNavigate('/category/[slug]', { slug: 'tea-and-coffee' })}
                  style={styles.shortcutCard}
                >
                  <View style={[styles.shortcutIconFrame, { backgroundColor: '#1A4D2E' }]}>
                    <Text style={styles.shortcutEmoji}>☕</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.shortcutLabel}>
                    Tea & Coffee
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Category Baby Care"
                  onPress={() => handleNavigate('/category/[slug]', { slug: 'baby-care' })}
                  style={styles.shortcutCard}
                >
                  <View style={[styles.shortcutIconFrame, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.shortcutEmoji}>👶</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.shortcutLabel}>
                    Baby Care
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Category Cooking Essentials"
                  onPress={() => handleNavigate('/category/[slug]', { slug: 'cooking-essentials' })}
                  style={styles.shortcutCard}
                >
                  <View style={[styles.shortcutIconFrame, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={styles.shortcutEmoji}>🌾</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.shortcutLabel}>
                    Cooking Essentials
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* Section: Main Menu Action List (Image 1 style) */}
            <View style={styles.actionList}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="My Orders, Track active and past grocery orders"
                onPress={() => handleNavigate('/orders')}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              >
                <Text style={styles.actionIcon}>📦</Text>
                <View style={styles.actionTextFrame}>
                  <Text style={styles.actionTitle}>My Orders</Text>
                  <Text style={styles.actionSubtitle}>Track active & past grocery orders</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Saved Wishlist, Frequently purchased favorites"
                onPress={() => handleNavigate('/wishlist')}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              >
                <Text style={styles.actionIcon}>🔖</Text>
                <View style={styles.actionTextFrame}>
                  <Text style={styles.actionTitle}>Saved / Wishlist</Text>
                  <Text style={styles.actionSubtitle}>Frequently purchased favorites</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delivery Coverage, 1 km radius and free shipping rules"
                onPress={() => handleNavigate('/delivery')}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              >
                <Text style={styles.actionIcon}>🚚</Text>
                <View style={styles.actionTextFrame}>
                  <Text style={styles.actionTitle}>Delivery Coverage</Text>
                  <Text style={styles.actionSubtitle}>1 km radius & free shipping rules</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Help and Support, Chat on WhatsApp with store manager"
                onPress={() => handleNavigate('/help')}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              >
                <Text style={styles.actionIcon}>💬</Text>
                <View style={styles.actionTextFrame}>
                  <Text style={styles.actionTitle}>Help & Support</Text>
                  <Text style={styles.actionSubtitle}>Chat on WhatsApp with store manager</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings and Privacy, Language, notifications and policies"
                onPress={() => handleNavigate('/settings')}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              >
                <Text style={styles.actionIcon}>⚙️</Text>
                <View style={styles.actionTextFrame}>
                  <Text style={styles.actionTitle}>Settings & Privacy</Text>
                  <Text style={styles.actionSubtitle}>Language, notifications & policies</Text>
                </View>
              </Pressable>
            </View>

            {/* Auth / Account Action Button */}
            <View style={styles.footerAuth}>
              {isLoggedIn ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign Out"
                  onPress={() => {
                    closeDrawer();
                    logout();
                  }}
                  style={styles.authButtonSecondary}
                >
                  <Text style={styles.authButtonSecondaryText}>Sign Out</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign In or Register"
                  onPress={() => handleNavigate('/login')}
                  style={styles.authButtonPrimary}
                >
                  <Text style={styles.authButtonPrimaryText}>Sign In / Register</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  drawerPanel: {
    flex: 1,
    backgroundColor: '#161619',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        boxShadow: '10px 0 40px rgba(0, 0, 0, 0.6)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 20,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#242429',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  profileTextContainer: {
    flex: 1,
  },
  profileTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  profileSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#242429',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  shortcutsRow: {
    gap: 12,
    flexDirection: 'row',
  },
  shortcutCard: {
    width: 68,
    alignItems: 'center',
    gap: 6,
  },
  shortcutIconFrame: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutEmoji: {
    fontSize: 26,
  },
  shortcutLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionList: {
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#242429',
  },
  actionCardPressed: {
    backgroundColor: '#2c2c33',
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    fontSize: 22,
  },
  actionTextFrame: {
    flex: 1,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  footerAuth: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  authButtonPrimary: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonPrimaryText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  authButtonSecondary: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#242429',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  authButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
