import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Locale } from '../../services/home';
import { colors } from '../../theme';

const copy = {
  en: {
    title: 'Settings',
    languageSection: 'Language Preference',
    english: 'English',
    bengali: 'বাংলা (Bengali)',
    notificationsSection: 'Notifications',
    orderUpdates: 'Order Status Updates',
    orderUpdatesDesc: 'Receive notifications about order confirmation and delivery',
    promoUpdates: 'Special Offers & Deals',
    promoUpdatesDesc: 'Get alerts for daily grocery flash sales',
    aboutSection: 'About Lucky Store',
    storeName: 'Lucky Store — Emdad Park',
    storeAddress: '665 Percival Hill Rd, Chittagong 4203',
    appVersion: 'App Version: 1.0.0 (Native)',
  },
  bn: {
    title: 'সেটিংস',
    languageSection: 'ভাষা নির্বাচন',
    english: 'English (ইংরেজি)',
    bengali: 'বাংলা',
    notificationsSection: 'নোটিফিকেশন',
    orderUpdates: 'অর্ডারের আপডেট',
    orderUpdatesDesc: 'অর্ডার নেওয়া এবং ডেলিভারির নোটিফিকেশন পান',
    promoUpdates: 'অফার ও ডিসকাউন্ট',
    promoUpdatesDesc: 'দৈনন্দিন নিত্যপ্রয়োজনীয় পণ্যের স্পেশাল অফার অ্যালার্ট',
    aboutSection: 'লাকি স্টোর সম্পর্কে',
    storeName: 'লাকি স্টোর — এমদাদ পার্ক',
    storeAddress: '৬৬৫ পারসিভাল হিল রোড, চট্টগ্রাম ৪২০৩',
    appVersion: 'অ্যাপ ভার্সন: ১.০.০ (নেটিভ)',
  },
} as const;

export function SettingsScreen() {
  const [locale, setLocale] = useState<Locale>('en');
  const [orderNotifs, setOrderNotifs] = useState(true);
  const [promoNotifs, setPromoNotifs] = useState(false);
  const t = copy[locale];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>{t.title}</Text>

      {/* Language Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t.languageSection}</Text>
        <View style={styles.card}>
          <Pressable
            style={[styles.row, locale === 'en' ? styles.activeRow : null]}
            onPress={() => setLocale('en')}
            accessibilityRole="radio"
            accessibilityState={{ checked: locale === 'en' }}
          >
            <Text style={styles.rowLabel}>{t.english}</Text>
            <Text style={styles.radioText}>{locale === 'en' ? '🔘' : '⚪'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={[styles.row, locale === 'bn' ? styles.activeRow : null]}
            onPress={() => setLocale('bn')}
            accessibilityRole="radio"
            accessibilityState={{ checked: locale === 'bn' }}
          >
            <Text style={styles.rowLabel}>{t.bengali}</Text>
            <Text style={styles.radioText}>{locale === 'bn' ? '🔘' : '⚪'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t.notificationsSection}</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.rowLabel}>{t.orderUpdates}</Text>
              <Text style={styles.rowSublabel}>{t.orderUpdatesDesc}</Text>
            </View>
            <Switch
              value={orderNotifs}
              onValueChange={setOrderNotifs}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.rowLabel}>{t.promoUpdates}</Text>
              <Text style={styles.rowSublabel}>{t.promoUpdatesDesc}</Text>
            </View>
            <Switch
              value={promoNotifs}
              onValueChange={setPromoNotifs}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.surface}
            />
          </View>
        </View>
      </View>

      {/* Store & App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t.aboutSection}</Text>
        <View style={styles.card}>
          <Text style={styles.storeName}>{t.storeName}</Text>
          <Text style={styles.storeAddress}>{t.storeAddress}</Text>
          <View style={styles.divider} />
          <Text style={styles.versionText}>{t.appVersion}</Text>
        </View>
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
    paddingBottom: 40,
    gap: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.deepNight,
    marginBottom: 4,
  },
  section: {
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  activeRow: {
    opacity: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepNight,
  },
  radioText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchTextCol: {
    flex: 1,
    gap: 2,
  },
  rowSublabel: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepNight,
  },
  storeAddress: {
    fontSize: 12,
    color: colors.muted,
  },
  versionText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
});
