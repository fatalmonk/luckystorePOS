import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Locale } from '../../services/home';
import { useTabBarScroll } from '../../state/tab-bar-scroll-context';
import { colors } from '../../theme';

const copy = {
  en: {
    title: 'Help & Contact',
    subtitle: 'We are here to assist with your groceries, orders, and inquiries.',
    whatsappSection: 'Fast Support on WhatsApp',
    whatsappDesc: 'Chat directly with our Chittagong store team for immediate assistance with order updates or item requests.',
    openWhatsapp: '💬 Chat on WhatsApp (+8801731944544)',
    phoneSection: 'Phone Support',
    phoneDesc: 'Call our store hotline during operating hours (8:00 AM – 10:00 PM).',
    callNow: '📞 Call 01731944544',
    emailSection: 'Email Inquiries',
    emailAddress: 'support@luckystore1947.com',
    locationSection: 'Store Location & Hours',
    storeLocation: 'Lucky Store — Emdad Park',
    storeAddress: '665 Percival Hill Rd, Chittagong 4203',
    storeHours: 'Every day: 8:00 AM – 10:00 PM',
    openError: 'Could not launch the app directly. You can call or WhatsApp us manually at +8801731944544 or email support@luckystore1947.com.',
  },
  bn: {
    title: 'সাহায্য ও যোগাযোগ',
    subtitle: 'বাজার, অর্ডার বা যেকোনো তথ্যের জন্য আমরা আপনার পাশে আছি।',
    whatsappSection: 'হোয়াটসঅ্যাপে দ্রুত সাহায্য',
    whatsappDesc: 'অর্ডার আপডেট বা যেকোনো তথ্যের জন্য সরাসরি আমাদের স্টোর টিমের সাথে হোয়াটসঅ্যাপে কথা বলুন।',
    openWhatsapp: '💬 হোয়াটসঅ্যাপে চ্যাট করুন (01731944544)',
    phoneSection: 'ফোন হেল্পলাইন',
    phoneDesc: 'সকাল ৮টা থেকে রাত ১০টার মধ্যে সরাসরি কল করুন।',
    callNow: '📞 কল করুন 01731944544',
    emailSection: 'ইমেইল যোগাযোগ',
    emailAddress: 'support@luckystore1947.com',
    locationSection: 'স্টোরের ঠিকানা ও সময়সূচী',
    storeLocation: 'লাকি স্টোর — এমদাদ পার্ক',
    storeAddress: '৬৬৫ পারসিভাল হিল রোড, চট্টগ্রাম ৪২০৩',
    storeHours: 'প্রতিদিন: সকাল ৮টা – রাত ১০টা',
    openError: 'সরাসরি অ্যাপ খুলতে সমস্যা হচ্ছে। আপনি সরাসরি +8801731944544 নম্বরে কল বা হোয়াটসঅ্যাপ করতে পারেন অথবা support@luckystore1947.com এ ইমেইল করতে পারেন।',
  },
} as const;

export function HelpScreen() {
  const { onScroll } = useTabBarScroll();
  const [locale, setLocale] = useState<Locale>('en');
  const [actionError, setActionError] = useState<string | null>(null);
  const t = copy[locale];

  const handleOpenWhatsApp = () => {
    setActionError(null);
    Linking.openURL('https://wa.me/8801731944544').catch(() => {
      setActionError(t.openError);
    });
  };

  const handleCall = () => {
    setActionError(null);
    Linking.openURL('tel:+8801731944544').catch(() => {
      setActionError(t.openError);
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Bar */}
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
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      {actionError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text selectable style={styles.errorText}>
            {actionError}
          </Text>
        </View>
      ) : null}

      {/* WhatsApp Support */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t.whatsappSection}</Text>
        <Text style={styles.cardBody}>{t.whatsappDesc}</Text>
        <Pressable
          style={({ pressed }) => [styles.whatsappButton, pressed && styles.pressedScale]}
          onPress={handleOpenWhatsApp}
          accessibilityRole="button"
        >
          <Text style={styles.whatsappButtonText}>{t.openWhatsapp}</Text>
        </Pressable>
      </View>

      {/* Phone Support */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t.phoneSection}</Text>
        <Text style={styles.cardBody}>{t.phoneDesc}</Text>
        <Pressable
          style={({ pressed }) => [styles.phoneButton, pressed && styles.pressedScale]}
          onPress={handleCall}
          accessibilityRole="button"
        >
          <Text style={styles.phoneButtonText}>{t.callNow}</Text>
        </Pressable>
      </View>

      {/* Store Location */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t.locationSection}</Text>
        <Text style={styles.storeName}>{t.storeLocation}</Text>
        <Text selectable style={styles.cardBody}>{t.storeAddress}</Text>
        <Text style={styles.storeHours}>⏰ {t.storeHours}</Text>
        <Text selectable style={styles.emailText}>✉️ {t.emailAddress}</Text>
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
    paddingBottom: 110,
    gap: 14,
  },
  pressedScale: {
    transform: [{ scale: 0.96 }],
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.deepNight,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 4,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepNight,
  },
  cardBody: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  whatsappButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  phoneButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  phoneButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  storeHours: {
    fontSize: 13,
    color: colors.green,
    fontWeight: '600',
    marginTop: 2,
  },
  emailText: {
    fontSize: 13,
    color: colors.deepNight,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: '#FDE8E8',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
