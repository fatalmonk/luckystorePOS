import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

export function PrivacyScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>
          How Lucky Store collects, uses, and safeguards customer data.
        </Text>
        <Text style={styles.date}>Effective: May 2024</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📋 Information We Collect</Text>
        <Text style={styles.bodyText}>
          We collect your name, phone number, and delivery address to fulfill grocery orders. If you register an account, your email and authentication credentials are encrypted securely.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🚚 How We Use Your Data</Text>
        <Text style={styles.bodyText}>
          Your details are strictly used for delivery dispatching, order confirmation (via SMS or WhatsApp), doorstep customer service, and preventing fraudulent transactions.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🛡️ Data Security & Protection</Text>
        <Text style={styles.bodyText}>
          All communications use TLS/HTTPS encryption. We do not sell, rent, or trade customer information with external marketing companies.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🗑️ Your Data Rights</Text>
        <Text style={styles.bodyText}>
          You have the right to inspect, update, or permanently delete your account and order history at any time through our Data Deletion request flow.
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
    paddingBottom: 40,
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
