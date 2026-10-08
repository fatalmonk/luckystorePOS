import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../../state/auth-context';
import { colors } from '../../theme';

export function DeleteAccountScreen() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const [requested, setRequested] = useState(false);

  const handleRequestDeletion = () => {
    handleContactSupport();
    setRequested(true);
  };

  const handleContactSupport = () => {
    const email = 'support@luckystore1947.com';
    const subject = encodeURIComponent(`Account Deletion Request - ${user?.email || 'Customer'}`);
    const body = encodeURIComponent(
      `Please permanently delete my customer account and associated data.\n\nAccount Email: ${
        user?.email || ''
      }\nCustomer Name: ${user?.name || ''}`
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {});
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>🗑️</Text>
        <Text accessibilityRole="header" style={styles.title}>Account & Data Deletion</Text>
        <Text style={styles.subtitle}>
          Request permanent deletion of your personal data and Lucky Store account.
        </Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>📂 What Data Will Be Deleted</Text>
        <Text style={styles.bodyText}>• Your profile name, phone number, and email.</Text>
        <Text style={styles.bodyText}>• Saved delivery addresses and contact information.</Text>
        <Text style={styles.bodyText}>• Authentication and login sessions.</Text>
        <Text style={styles.noteText}>
          Note: Historical completed order receipts required for statutory taxation and accounting audit records may be retained as legally mandated.
        </Text>
      </View>

      {requested ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.successCard}>
          <Text style={styles.successTitle}>✓ Deletion Request Submitted</Text>
          <Text style={styles.successBody}>
            Your request has been recorded. Our team will review and process your deletion within 30 days. You will receive confirmation via email.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              logout();
              router.replace('/(tabs)/(home)' as any);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Sign Out & Return to Home</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️ Confirm Deletion</Text>
          <Text style={styles.bodyText}>
            {isLoggedIn && user
              ? `You are currently signed in as ${user.name} (${user.email}).`
              : 'You can submit a data deletion request by contacting our support team.'}
          </Text>

          {isLoggedIn ? (
            <Pressable
              style={styles.dangerButton}
              onPress={handleRequestDeletion}
              accessibilityRole="button"
            >
              <Text style={styles.dangerButtonText}>Submit Deletion Request</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.secondaryButton}
            onPress={handleContactSupport}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>✉️ Email Support Directly</Text>
          </Pressable>
        </View>
      )}
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
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
    fontWeight: '700',
    color: colors.deepNight,
  },
  bodyText: {
    fontSize: 13,
    color: colors.deepNight,
    lineHeight: 18,
  },
  noteText: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 4,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepNight,
  },
  successCard: {
    backgroundColor: '#DCEEE4',
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.green,
  },
  successBody: {
    fontSize: 13,
    color: colors.deepNight,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: colors.deepNight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.surface,
  },
});
