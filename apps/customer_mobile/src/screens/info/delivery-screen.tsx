import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Locale } from '../../services/home';
import { colors } from '../../theme';

const copy = {
  en: {
    title: 'Delivery Policy & Coverage',
    hubTitle: '🏪 Local Store Hub',
    hubAddress: 'Lucky Store · 665 Percival Hill Rd, Chittagong 4203',
    hubDesc: 'All orders are freshly packed and dispatched directly from our physical grocery store in Chittagong.',
    timingTitle: '⏰ Delivery Slots',
    morningSlot: 'Morning Slot: 9:00 AM – 1:00 PM (Orders placed by 8:30 AM)',
    eveningSlot: 'Evening Slot: 4:00 PM – 8:00 PM (Orders placed by 3:30 PM)',
    feeTitle: '💵 Delivery Charges',
    freeDelivery: '• Free Delivery: Orders ৳500 and above',
    standardDelivery: '• Standard Delivery: ৳40 for orders under ৳500',
    coverageTitle: '📍 Covered Neighborhoods in Chattogram',
    coverageList: [
      'Emdad Park & Percival Hill Road',
      'Nasirabad & O.R. Nizam Road',
      'GEC Circle & Dampara',
      'Khulshi & South Khulshi',
      'Panchlaish & Katalganj',
      'Chawkbazar & Mehedibag',
      'Agrabad Commercial Area',
      'Muradpur & Bahaddarhat',
      'Halishahar & Lalkhan Bazar',
    ],
    inspectionTitle: '🛡️ Doorstep Inspection Guarantee',
    inspectionDesc: 'We believe in 100% transparency. When your rider arrives, inspect all items before paying. If any item does not meet your freshness standard, return it on the spot with zero hassle.',
  },
  bn: {
    title: 'ডেলিভারি এলাকা ও নিয়মাবলী',
    hubTitle: '🏪 স্থানীয় স্টোর হাব',
    hubAddress: 'লাকি স্টোর · ৬৬৫ পারসিভাল হিল রোড, চট্টগ্রাম ৪২০৩',
    hubDesc: 'চট্টগ্রামের আমাদের নিজস্ব স্টোর থেকে প্রতিটি অর্ডার যত্নসহকারে প্যাক করে ডেলিভারি দেওয়া হয়।',
    timingTitle: '⏰ ডেলিভারি স্লট',
    morningSlot: 'সকালের স্লট: সকাল ৯টা – দুপুর ১টা (সকাল ৮:৩০ এর মধ্যে অর্ডার)',
    eveningSlot: 'বিকালের স্লট: বিকাল ৪টা – রাত ৮টা (বিকাল ৩:৩০ এর মধ্যে অর্ডার)',
    feeTitle: '💵 ডেলিভারি চার্জ',
    freeDelivery: '• ফ্রি ডেলিভারি: ৫০০ টাকা বা তার বেশি অর্ডারে',
    standardDelivery: '• স্ট্যান্ডার্ড চার্জ: ৫০০ টাকার কম অর্ডারে মাত্র ৪০ টাকা',
    coverageTitle: '📍 চট্টগ্রামের আওতাভুক্ত এলাকাসমূহ',
    coverageList: [
      'এমদাদ পার্ক ও পারসিভাল হিল রোড',
      'নাসিরাবাদ ও ও.আর. নিজাম রোড',
      'জিইসি মোড় ও দামপাড়া',
      'খুলশী ও দক্ষিণ খুলশী',
      'পাঁচলাইশ ও কাতালগঞ্জ',
      'চকবাজার ও মেহেদীবাগ',
      'আগ্রাবাদ বাণিজ্যিক এলাকা',
      'মুরাদপুর ও বহদ্দারহাট',
      'হালিশহর ও লালখান বাজার',
    ],
    inspectionTitle: '🛡️ দরজায় পণ্য যাচাইয়ের নিশ্চয়তা',
    inspectionDesc: 'আমরা শতভাগ বিশ্বস্ততায় বিশ্বাস করি। রাইডার পৌঁছালে পণ্য দেখে নিশ্চিত হয়ে টাকা পরিশোধ করুন। কোনো পণ্যে সন্তুষ্ট না হলে সাথে সাথেই ফেরত দিতে পারবেন।',
  },
} as const;

export function DeliveryScreen() {
  const [locale, setLocale] = useState<Locale>('en');
  const t = copy[locale];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
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

      {/* Store Hub */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t.hubTitle}</Text>
        <Text style={styles.hubAddress}>{t.hubAddress}</Text>
        <Text style={styles.cardBody}>{t.hubDesc}</Text>
      </View>

      {/* Slots */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t.timingTitle}</Text>
        <Text style={styles.slotItem}>{t.morningSlot}</Text>
        <Text style={styles.slotItem}>{t.eveningSlot}</Text>
      </View>

      {/* Charges */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t.feeTitle}</Text>
        <Text style={[styles.feeItem, styles.freeFee]}>{t.freeDelivery}</Text>
        <Text style={styles.feeItem}>{t.standardDelivery}</Text>
      </View>

      {/* Neighborhoods */}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t.coverageTitle}</Text>
        <View style={styles.neighborhoodGrid}>
          {t.coverageList.map((item, idx) => (
            <View key={idx} style={styles.neighborhoodPill}>
              <Text style={styles.neighborhoodText}>✓ {item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Doorstep Inspection */}
      <View style={[styles.card, styles.inspectionCard]}>
        <Text accessibilityRole="header" style={styles.inspectionTitle}>{t.inspectionTitle}</Text>
        <Text style={styles.inspectionBody}>{t.inspectionDesc}</Text>
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
    gap: 14,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepNight,
  },
  hubAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  cardBody: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  slotItem: {
    fontSize: 13,
    color: colors.deepNight,
    lineHeight: 18,
  },
  feeItem: {
    fontSize: 13,
    color: colors.deepNight,
    lineHeight: 18,
  },
  freeFee: {
    color: colors.green,
    fontWeight: '700',
  },
  neighborhoodGrid: {
    gap: 6,
    marginTop: 4,
  },
  neighborhoodPill: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  neighborhoodText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.deepNight,
  },
  inspectionCard: {
    backgroundColor: '#FFFDF5',
    borderColor: colors.accent,
  },
  inspectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepNight,
  },
  inspectionBody: {
    fontSize: 13,
    color: '#554200',
    lineHeight: 18,
  },
});
