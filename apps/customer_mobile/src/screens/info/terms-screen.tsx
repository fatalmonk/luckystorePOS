import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTabBarScroll } from '../../state/tab-bar-scroll-context';
import { colors } from '../../theme';

export function TermsScreen() {
  const { onScroll } = useTabBarScroll();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>📜</Text>
        <Text accessibilityRole="header" style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>
          Terms governing purchases, deliveries, and store interactions.
        </Text>
        <Text style={styles.date}>Effective: May 2024</Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>🛒 Ordering & Acceptance</Text>
        <Text style={styles.bodyText}>
          Orders placed via the app are subject to physical store stock confirmation and pricing validation at time of fulfillment.
        </Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>💵 Pricing & Payment</Text>
        <Text style={styles.bodyText}>
          All prices are displayed in Bangladeshi Taka (৳ BDT). Payment methods include Cash on Delivery and bKash. We do not store sensitive bank card credentials.
        </Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>🚚 Delivery & Doorstep Inspection</Text>
        <Text style={styles.bodyText}>
          Delivery slots are approximate within Chattogram city zones. Customers are encouraged to inspect goods upon delivery before making payment.
        </Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>🔄 Returns & Refunds</Text>
        <Text style={styles.bodyText}>
          Perishable items may be rejected at the doorstep if damaged or unsatisfactory. Non-perishable items with defects can be returned within 24 hours with the order receipt.
        </Text>
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
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  icon: {
    fontSize: 36,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.deepNight,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  date: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.deepNight,
  },
  bodyText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});
