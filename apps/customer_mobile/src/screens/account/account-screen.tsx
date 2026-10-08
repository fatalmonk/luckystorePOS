import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Logo } from '../../components/ui';
import { Locale } from '../../services/home';
import { useAuth } from '../../state/auth-context';
import { colors, shadows } from '../../theme';

const copy = {
  en: {
    title: 'Account',
    guestTitle: 'Welcome to Lucky Store',
    guestSubtitle: 'Sign in to access your order history, saved addresses, and profile details.',
    signIn: 'Sign In',
    createAccount: 'Create Account',
    trackGuestOrder: 'Track Guest Order',
    trackOrderPlaceholder: 'Enter Order Number (e.g. LSO-...)',
    trackButton: 'Track Order',
    profileSection: 'My Profile',
    phone: 'Phone',
    email: 'Email',
    address: 'Delivery Address',
    menuSection: 'Menu & Services',
    orders: '📦 My Orders',
    ordersDesc: 'View past orders and tracking',
    wishlist: '❤️ Wishlist',
    wishlistDesc: 'Saved favorite items',
    settings: '⚙️ Settings & Language',
    settingsDesc: 'Language, notifications, preferences',
    deliveryInfo: '🚚 Delivery Policy & Coverage',
    deliveryInfoDesc: 'Chittagong delivery zones and timings',
    helpSupport: '💬 Help & Support',
    helpSupportDesc: 'WhatsApp support, contact details',
    legalSection: 'Legal & Privacy',
    privacy: '🛡️ Privacy Policy',
    terms: '📜 Terms of Service',
    securityPolicy: '🔒 Security Policy',
    dataDeletion: '🗑️ Account & Data Deletion',
    signOut: 'Sign Out',
    versionInfo: 'Lucky Store App v1.0.0 · Emdad Park, Chittagong',
  },
  bn: {
    title: 'অ্যাকাউন্ট',
    guestTitle: 'লাকি স্টোরে স্বাগতম',
    guestSubtitle: 'আপনার পূর্ববর্তী অর্ডার ও প্রোফাইল দেখতে লগইন করুন।',
    signIn: 'লগইন করুন',
    createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    trackGuestOrder: 'গেস্ট অর্ডার ট্র্যাক করুন',
    trackOrderPlaceholder: 'অর্ডার নম্বর লিখুন (যেমন: LSO-...)',
    trackButton: 'অর্ডার ট্র্যাক করুন',
    profileSection: 'আমার প্রোফাইল',
    phone: 'ফোন নম্বর',
    email: 'ইমেইল',
    address: 'ডেলিভারি ঠিকানা',
    menuSection: 'মেনু ও সেবাসমূহ',
    orders: '📦 আমার অর্ডারসমূহ',
    ordersDesc: 'পূর্বের অর্ডার ও ডেলিভারি স্ট্যাটাস',
    wishlist: '❤️ পছন্দের তালিকা (উইশলিস্ট)',
    wishlistDesc: 'সংরক্ষিত পছন্দের পণ্যসমূহ',
    settings: '⚙️ সেটিংস ও ভাষা',
    settingsDesc: 'ভাষা পরিবর্তন ও পছন্দসমূহ',
    deliveryInfo: '🚚 ডেলিভারি নিয়ম ও এলাকা',
    deliveryInfoDesc: 'চট্টগ্রামের ডেলিভারি জোন ও সময়সূচী',
    helpSupport: '💬 সাহায্য ও যোগাযোগ',
    helpSupportDesc: 'হোয়াটসঅ্যাপ হেল্পলাইন ও কন্টাক্ট',
    legalSection: 'আইনি ও গোপনীয়তা',
    privacy: '🛡️ গোপনীয়তা নীতি',
    terms: '📜 ব্যবহারের শর্তাবলী',
    securityPolicy: '🔒 নিরাপত্তা নীতি',
    dataDeletion: '🗑️ অ্যাকাউন্ট ও ডাটা ডিলিট',
    signOut: 'লগআউট',
    versionInfo: 'লাকি স্টোর অ্যাপ v১.০.০ · এমদাদ পার্ক, চট্টগ্রাম',
  },
} as const;

import { getGuestOrderToken } from '../../services/storage';

export function AccountScreen() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const [locale, setLocale] = useState<Locale>('en');
  const [orderQuery, setOrderQuery] = useState('');
  const t = copy[locale];

  const handleTrackGuestOrder = async () => {
    const clean = orderQuery.trim().toUpperCase();
    if (!clean) return;
    router.push({
      pathname: '/order/[number]' as any,
      params: { number: clean },
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle} accessibilityRole="header">{t.title}</Text>
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

      {/* User / Guest Hero Card */}
      {isLoggedIn && user ? (
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfoCol}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone ? <Text style={styles.userPhone}>📱 {user.phone}</Text> : null}
            {user.address ? <Text style={styles.userAddress}>🏠 {user.address}</Text> : null}
          </View>
        </View>
      ) : (
        <View style={styles.guestCard}>
          <Logo size="md" style={{ marginBottom: 4 }} />
          <Text style={styles.guestTitle}>{t.guestTitle}</Text>
          <Text style={styles.guestSubtitle}>{t.guestSubtitle}</Text>

          <View style={styles.authButtonsRow}>
            <Pressable
              style={styles.primaryAuthButton}
              onPress={() => router.push('/login' as any)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryAuthButtonText}>{t.signIn}</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryAuthButton}
              onPress={() => router.push('/signup' as any)}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryAuthButtonText}>{t.createAccount}</Text>
            </Pressable>
          </View>

          {/* Guest Order Tracker */}
          <View style={styles.guestTrackerBox}>
            <Text style={styles.guestTrackerLabel}>🔍 {t.trackGuestOrder}</Text>
            <View style={styles.trackerInputRow}>
              <TextInput
                style={styles.trackerInput}
                placeholder={t.trackOrderPlaceholder}
                placeholderTextColor={colors.muted}
                value={orderQuery}
                onChangeText={setOrderQuery}
                autoCapitalize="characters"
              />
              <Pressable
                style={styles.trackerButton}
                onPress={handleTrackGuestOrder}
                accessibilityRole="button"
              >
                <Text style={styles.trackerButtonText}>{t.trackButton}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Menu & Navigation Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader} accessibilityRole="header">{t.menuSection}</Text>

        <View style={styles.menuCard}>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/orders' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t.orders}</Text>
              <Text style={styles.menuItemDesc}>{t.ordersDesc}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/wishlist' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t.wishlist}</Text>
              <Text style={styles.menuItemDesc}>{t.wishlistDesc}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/settings' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t.settings}</Text>
              <Text style={styles.menuItemDesc}>{t.settingsDesc}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/delivery' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t.deliveryInfo}</Text>
              <Text style={styles.menuItemDesc}>{t.deliveryInfoDesc}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/help' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t.helpSupport}</Text>
              <Text style={styles.menuItemDesc}>{t.helpSupportDesc}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Legal & Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader} accessibilityRole="header">{t.legalSection}</Text>

        <View style={styles.menuCard}>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/policies/privacy' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t.privacy}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/policies/terms' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t.terms}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/policies/security' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t.securityPolicy}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/account/delete' as any)}
            accessibilityRole="button"
          >
            <View style={styles.menuItemTextCol}>
              <Text style={[styles.menuItemTitle, styles.dangerText]}>
                {t.dataDeletion}
              </Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Sign Out Button if logged in */}
      {isLoggedIn ? (
        <Pressable
          style={styles.signOutButton}
          onPress={logout}
          accessibilityRole="button"
        >
          <Text style={styles.signOutButtonText}>{t.signOut}</Text>
        </Pressable>
      ) : null}

      {/* Version Footer */}
      <Text style={styles.versionFooter}>{t.versionInfo}</Text>
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 24,
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
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    ...shadows.card,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.deepNight,
  },
  userInfoCol: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepNight,
  },
  userEmail: {
    fontSize: 13,
    color: colors.muted,
  },
  userPhone: {
    fontSize: 12,
    color: colors.deepNight,
    marginTop: 2,
  },
  userAddress: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  guestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 20,
    gap: 12,
    ...shadows.card,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepNight,
  },
  guestSubtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryAuthButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAuthButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepNight,
  },
  secondaryAuthButton: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAuthButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  guestTrackerBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 8,
  },
  guestTrackerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepNight,
  },
  trackerInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trackerInput: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.deepNight,
  },
  trackerButton: {
    backgroundColor: colors.deepNight,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surface,
  },
  section: {
    marginBottom: 20,
    gap: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemTextCol: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  menuItemDesc: {
    fontSize: 11,
    color: colors.muted,
  },
  menuItemArrow: {
    fontSize: 18,
    color: colors.muted,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: 16,
  },
  dangerText: {
    color: colors.danger,
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.danger,
  },
  versionFooter: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
});
