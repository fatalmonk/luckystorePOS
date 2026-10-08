import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Logo } from '../../components/ui';
import { validateEmail, validatePassword } from '../../services/auth';
import { validatePhone } from '../../services/checkout';
import { Locale } from '../../services/home';
import { useAuth } from '../../state/auth-context';
import { colors, shadows } from '../../theme';

const copy = {
  en: {
    title: 'Create Account',
    subtitle: 'Join Lucky Store for faster checkouts and easy order tracking.',
    nameLabel: 'Full Name *',
    namePlaceholder: 'e.g. Karim Ahmed',
    phoneLabel: 'Mobile / WhatsApp Number',
    phonePlaceholder: '01XXXXXXXXX',
    emailLabel: 'Email Address *',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password *',
    passwordPlaceholder: 'At least 8 characters (letters & numbers)',
    signupButton: 'Create Account',
    signingUp: 'Creating account…',
    hasAccount: 'Already have an account?',
    signIn: 'Sign In',
    emailConfirmTitle: 'Account Created! ✉️',
    emailConfirmBody: 'Please check your email to confirm your account, then sign in.',
    invalidName: 'Please enter your full name',
    invalidEmail: 'Please enter a valid email address',
    invalidPhone: 'Please enter a valid BD phone number',
  },
  bn: {
    title: 'নতুন অ্যাকাউন্ট',
    subtitle: 'সহজে অর্ডার ও ট্র্যাকিং করতে লাকি স্টোরে যোগ দিন।',
    nameLabel: 'আপনার পূর্ণ নাম *',
    namePlaceholder: 'উদাঃ করিম আহমেদ',
    phoneLabel: 'মোবাইল / হোয়াটসঅ্যাপ নম্বর',
    phonePlaceholder: '01XXXXXXXXX',
    emailLabel: 'ইমেইল ঠিকানা *',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'পাসওয়ার্ড *',
    passwordPlaceholder: 'কমপক্ষে ৮ অক্ষর (অক্ষর ও সংখ্যা)',
    signupButton: 'অ্যাকাউন্ট তৈরি করুন',
    signingUp: 'অ্যাকাউন্ট তৈরি হচ্ছে…',
    hasAccount: 'আগে থেকেই অ্যাকাউন্ট আছে?',
    signIn: 'লগইন করুন',
    emailConfirmTitle: 'অ্যাকাউন্ট সফল হয়েছে! ✉️',
    emailConfirmBody: 'আপনার ইমেইল চেক করে কনফার্ম করুন, এরপর লগইন করুন।',
    invalidName: 'আপনার পূর্ণ নাম দিন',
    invalidEmail: 'সঠিক ইমেইল ঠিকানা দিন',
    invalidPhone: 'সঠিক মোবাইল নম্বর দিন',
  },
} as const;

export function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [locale, setLocale] = useState<Locale>('en');
  const t = copy[locale];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailConfirmMessage, setEmailConfirmMessage] = useState<string | null>(null);

  const handleSignup = async () => {
    setErrorMessage(null);
    setEmailConfirmMessage(null);

    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage(t.invalidName);
      return;
    }
    if (phone.trim() && !validatePhone(phone)) {
      setErrorMessage(t.invalidPhone);
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      setErrorMessage(t.invalidEmail);
      return;
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setErrorMessage(passwordCheck.error || 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await signup({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim(),
        password,
      });

      if (result.requiresEmailConfirmation) {
        setEmailConfirmMessage(t.emailConfirmBody);
      } else {
        router.replace('/(tabs)/(account)' as any);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.headerBar}>
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

        {/* Card Form */}
        <View style={styles.card}>
          <Logo size="lg" style={styles.brandLogo} />
          <Text style={styles.title} accessibilityRole="header">{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          {emailConfirmMessage ? (
            <View style={styles.successBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={styles.successTitle} accessibilityRole="header">{t.emailConfirmTitle}</Text>
              <Text style={styles.successBody}>{emailConfirmMessage}</Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.replace('/login' as any)}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>{t.signIn}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {errorMessage ? (
                <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                  <Text style={styles.errorText}>❌ {errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t.nameLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.namePlaceholder}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={t.nameLabel}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t.phoneLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.phonePlaceholder}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={t.phoneLabel}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t.emailLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.emailPlaceholder}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={t.emailLabel}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t.passwordLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.passwordPlaceholder}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={t.passwordLabel}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <Pressable
                style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
                onPress={handleSignup}
                disabled={loading}
                accessibilityRole="button"
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.deepNight} size="small" />
                    <Text style={styles.primaryButtonText}>{t.signingUp}</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>{t.signupButton}</Text>
                )}
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>{t.hasAccount}</Text>
                <Pressable
                  onPress={() => router.push('/login' as any)}
                  accessibilityRole="button"
                >
                  <Text style={styles.switchLink}>{t.signIn}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
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
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 16,
    ...shadows.card,
  },
  brandLogo: {
    alignSelf: 'center',
    marginBottom: 6,
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
    marginTop: -8,
    marginBottom: 4,
  },
  errorBox: {
    backgroundColor: '#FDE8E8',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#DCEEE4',
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 12,
    padding: 16,
    gap: 10,
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
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepNight,
  },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.deepNight,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepNight,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  switchText: {
    fontSize: 13,
    color: colors.muted,
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
});
