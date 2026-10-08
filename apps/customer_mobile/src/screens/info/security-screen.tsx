import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

export function SecurityScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>🔒</Text>
        <Text accessibilityRole="header" style={styles.title}>Security Policy</Text>
        <Text style={styles.subtitle}>
          How we protect your store orders and customer privacy.
        </Text>
        <Text style={styles.date}>Effective: May 2024</Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>🛡️ Encrypted Communications</Text>
        <Text style={styles.bodyText}>
          All data transmitted between this application and our servers is secured using industry-standard TLS encryption.
        </Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>🔑 Multi-Tenant Isolation</Text>
        <Text style={styles.bodyText}>
          Customer data and order records are partitioned strictly with multi-tenant row-level access controls to prevent data leakage.
        </Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>💳 Secure Transactions</Text>
        <Text style={styles.bodyText}>
          Payments are handled via secure Cash on Delivery or authorized mobile financial services. Sensitive financial authorization keys are never stored on client devices.
        </Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>🚨 Vulnerability Disclosure</Text>
        <Text style={styles.bodyText}>
          If you discover a potential security concern, please contact our security team at security@luckystore1947.com for responsible review.
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
