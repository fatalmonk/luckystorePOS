import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Logo } from '../../components/ui';
import { fetchHome, HomeDto, HomeProduct, Locale } from '../../services/home';
import { useCart } from '../../state/cart-context';
import { colors, shadows } from '../../theme';

const copy = {
  en: {
    eyebrow: 'CHAWKBAZAR · EST. 1947', hero: 'Groceries delivered to your doorstep.',
    body: 'Rice, oil, tea, snacks and daily essentials from the neighbourhood store families already know.',
    start: 'Start your order', delivery: 'Within 1 km · Free delivery ৳500+ · Pay after inspection',
    categories: 'Shop by routine', retry: 'Try again', loading: 'Loading today’s groceries…', seeAll: 'See all', add: 'Add', added: 'Added',
    unavailable: 'The live catalogue is temporarily unavailable. We will not show placeholder stock as orderable.',
    footerTitle: 'Lucky Store · Est. 1947', footerBody: 'Everyday groceries delivered with care across Chattogram.',
  },
  bn: {
    eyebrow: 'চকবাজার · ১৯৪৭ থেকে', hero: 'নিত্যপণ্য পৌঁছে যাবে আপনার দরজায়।',
    body: 'পরিচিত পাড়ার দোকান থেকে চাল, তেল, চা, নাস্তা ও দৈনন্দিন প্রয়োজনীয় পণ্য।',
    start: 'অর্ডার শুরু করুন', delivery: '১ কিমির মধ্যে · ৳৫০০+ ফ্রি ডেলিভারি · দেখে তারপর পেমেন্ট',
    categories: 'প্রয়োজন অনুযায়ী কিনুন', retry: 'আবার চেষ্টা করুন', loading: 'আজকের নিত্যপণ্য লোড হচ্ছে…', seeAll: 'সব দেখুন', add: 'যোগ করুন', added: 'যোগ হয়েছে',
    unavailable: 'লাইভ পণ্যের তালিকা এখন পাওয়া যাচ্ছে না। অস্থায়ী পণ্য অর্ডারযোগ্য হিসেবে দেখানো হবে না।',
    footerTitle: 'লাকি স্টোর · ১৯৪৭ থেকে', footerBody: 'চট্টগ্রামজুড়ে যত্নের সঙ্গে দৈনন্দিন নিত্যপণ্য পৌঁছে দিচ্ছি।',
  },
} as const;

export function HomeScreen() {
  const router = useRouter();
  const { add } = useCart();
  const [locale, setLocale] = useState<Locale>('en');
  const [home, setHome] = useState<HomeDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());
  const text = copy[locale];

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { setHome(await fetchHome(locale)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Home is unavailable'); }
    finally { setRefreshing(false); }
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchHome(locale, controller.signal).then(setHome).catch((cause) => {
      if (cause instanceof Error && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'Home is unavailable');
    });
    return () => controller.abort();
  }, [locale]);

  const sections = useMemo(() => home?.sections ?? [], [home]);

  if (!home && !error) {
    return <View style={styles.center}><ActivityIndicator color={colors.green} size="large" /><Text style={styles.loading}>{text.loading}</Text></View>;
  }

  return (
    <FlatList
      data={sections}
      keyExtractor={(section) => section.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.green} />}
      ListHeaderComponent={<>
        <View style={styles.localeRow}>
          <Logo size="md" />
          <Pressable accessibilityRole="button" accessibilityLabel={locale === 'en' ? 'Switch to Bengali' : 'Switch to English'} onPress={() => {
            setHome(null); setError(null); setLocale((value) => value === 'en' ? 'bn' : 'en');
          }} style={styles.localeButton}>
            <Text style={styles.localeText}>{locale === 'en' ? 'বাংলা' : 'English'}</Text>
          </Pressable>
        </View>
        <View accessibilityRole="summary" style={styles.hero}>
          <Text style={styles.eyebrow}>{text.eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>{text.hero}</Text>
          <Text style={styles.heroBody}>{text.body}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={text.start} onPress={() => router.push('/(tabs)/(shop)')} style={styles.startButton}>
            <Text style={styles.startButtonText}>{text.start}</Text>
          </Pressable>
          <Text style={styles.delivery}>{text.delivery}</Text>
        </View>
        {error || home?.degraded ? <View accessibilityRole="alert" style={styles.errorCard}>
          <Text style={styles.errorTitle}>{text.unavailable}</Text>
          {error ? <Text style={styles.errorDetail}>{error}</Text> : null}
          <Pressable onPress={() => void refresh()} style={styles.retryButton}><Text style={styles.retryText}>{text.retry}</Text></Pressable>
        </View> : null}
        {home?.categories.length ? <View style={styles.block}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{text.categories}</Text>
          <FlatList horizontal data={home.categories} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent}
            renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: item.slug } })} style={styles.categoryCard}>
              <Text style={styles.categoryEmoji}>{item.emoji}</Text><Text numberOfLines={2} style={styles.categoryName}>{item.name}</Text>
            </Pressable>} />
        </View> : null}
      </>}
      renderItem={({ item: section }) => <View style={styles.block}>
        <View style={styles.sectionHeadingRow}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, styles.flushTitle]}>{section.title}</Text>
          <Pressable onPress={() => router.push('/(tabs)/(shop)')}><Text style={styles.seeAll}>{text.seeAll}</Text></Pressable>
        </View>
        <FlatList horizontal data={section.products} keyExtractor={(product) => product.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent}
          renderItem={({ item }) => <ProductCard product={item} added={addedIds.has(item.id)} addLabel={text.add} addedLabel={text.added}
            onOpen={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
            onAdd={() => {
              if (addedIds.has(item.id)) return;
              add(item.id, {
                name: item.name,
                price: item.price,
                originalPrice: item.originalPrice,
                unit: item.unit,
                imageUrl: item.imageUrl,
                emoji: item.emoji,
                stock: item.stock,
              });
              setAddedIds((current) => new Set(current).add(item.id));
            }} />} />
      </View>}
      ListFooterComponent={<View style={styles.footer}><Logo size="sm" style={{ marginBottom: 8 }} /><Text style={styles.footerTitle}>{text.footerTitle}</Text><Text style={styles.footerText}>{text.footerBody}</Text></View>}
    />
  );
}

function ProductCard({ product, added, addLabel, addedLabel, onOpen, onAdd }: { product: HomeProduct; added: boolean; addLabel: string; addedLabel: string; onOpen: () => void; onAdd: () => void }) {
  return <View style={styles.productCard}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={onOpen}>
      <View style={styles.productImageFrame}>{product.imageUrl ? <Image source={product.imageUrl} contentFit="contain" style={styles.productImage} /> : <Text style={styles.productEmoji}>{product.emoji}</Text>}</View>
      <Text numberOfLines={2} style={styles.productName}>{product.name}</Text><Text style={styles.unit}>{product.unit}</Text><Text style={styles.price}>৳{product.price.toLocaleString('en-BD')}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${addLabel}: ${product.name}`} disabled={added} onPress={onAdd} style={[styles.addButton, added && styles.addedButton]}><Text style={styles.addText}>{added ? addedLabel : addLabel}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.paper }, loading: { color: colors.muted, fontSize: 15 }, content: { paddingBottom: 40 },
  localeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 6 }, localeButton: { borderColor: colors.line, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.surface }, localeText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  hero: { margin: 16, borderRadius: 28, backgroundColor: colors.green, padding: 24, gap: 12, ...shadows.card }, eyebrow: { color: '#DDECE3', fontSize: 12, fontWeight: '800', letterSpacing: 1.3 }, heroTitle: { color: '#FFFFFF', fontSize: 32, lineHeight: 37, fontWeight: '900' }, heroBody: { color: '#EDF6F0', fontSize: 16, lineHeight: 24 }, startButton: { minHeight: 46, borderRadius: 16, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, alignSelf: 'flex-start', justifyContent: 'center' }, startButtonText: { color: colors.ink, fontSize: 15, fontWeight: '900' }, delivery: { color: '#DDECE3', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  errorCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, backgroundColor: '#F9E8E3', gap: 8 }, errorTitle: { color: colors.danger, fontWeight: '800', lineHeight: 21 }, errorDetail: { color: colors.muted, fontSize: 12 }, retryButton: { alignSelf: 'flex-start', borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8 }, retryText: { color: colors.ink, fontWeight: '700' },
  block: { marginTop: 20 }, sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }, sectionTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '900', paddingHorizontal: 18, marginBottom: 12 }, flushTitle: { paddingHorizontal: 0 }, seeAll: { color: colors.green, fontWeight: '800', paddingBottom: 12 }, horizontalContent: { gap: 12, paddingHorizontal: 18 },
  categoryCard: { width: 116, minHeight: 112, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, padding: 14, justifyContent: 'space-between', ...shadows.card }, categoryEmoji: { fontSize: 30 }, categoryName: { color: colors.ink, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  productCard: { width: 174, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, padding: 12, gap: 10, ...shadows.card }, productImageFrame: { height: 126, borderRadius: 16, backgroundColor: '#F6F2EA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, productImage: { width: '100%', height: '100%' }, productEmoji: { fontSize: 48 }, productName: { color: colors.ink, minHeight: 42, marginTop: 10, fontSize: 15, lineHeight: 20, fontWeight: '800' }, unit: { color: colors.muted, fontSize: 12, marginTop: 4 }, price: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 4 }, addButton: { minHeight: 42, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, addedButton: { backgroundColor: colors.greenSoft }, addText: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  footer: { margin: 18, marginTop: 36, borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 24, gap: 5 }, footerTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' }, footerText: { color: colors.muted, lineHeight: 21 },
});
