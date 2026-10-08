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
import { validateEmail } from '../../services/auth';
import { Locale } from '../../services/home';
import { useAuth } from '../../state/auth-context';
import { colors, shadows } from '../../theme';

const copy = {
  en: {
    title: 'Welcome Back',
    subtitle: 'Sign in to access your orders and saved details.',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    show: 'Show',
    hide: 'Hide',
    loginButton: 'Sign In',
    loggingIn: 'Signing in…',
    noAccount: 'Don’t have an account?',
    createAccount: 'Sign Up',
    guestButton: 'Continue as Guest',
    invalidEmail: 'Please enter a valid email address',
    emptyPassword: 'Password cannot be empty',
  },
  bn: {
    title: 'স্বাগতম',
    subtitle: 'আপনার অর্ডার ও সংরক্ষিত তথ্য দেখতে লগইন করুন।',
    emailLabel: 'ইমেইল ঠিকানা',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: 'পাসওয়ার্ড দিন',
    show: 'দেখান',
    hide: 'লুকান',
    loginButton: 'লগইন করুন',
    loggingIn: 'লগইন হচ্ছে…',
    noAccount: 'কোনো অ্যাকাউন্ট নেই?',
    createAccount: 'নতুন অ্যাকাউন্ট তৈরি করুন',
    guestButton: 'গেস্ট হিসেবে চালিয়ে যান',
    invalidEmail: 'সঠিক ইমেইল ঠিকানা দিন',
    emptyPassword: 'পাসওয়ার্ড ফাঁকা রাখা যাবে না',
  },
} as const;

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [locale, setLocale] = useState<Locale>('en');
  const t = copy[locale];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!email.trim() || !validateEmail(email)) {
      setErrorMessage(t.invalidEmail);
      return;
    }
    if (!password) {
      setErrorMessage(t.emptyPassword);
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(tabs)/(account)' as any);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
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

          {errorMessage ? (
            <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              <Text style={styles.errorText}>❌ {errorMessage}</Text>
            </View>
          ) : null}

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
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor={colors.muted}
                accessibilityLabel={t.passwordLabel}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.showHideButton}
                onPress={() => setShowPassword((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t.hide : t.show}
                hitSlop={8}
              >
                <Text style={styles.showHideText}>
                  {showPassword ? t.hide : t.show}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.deepNight} size="small" />
                <Text style={styles.primaryButtonText}>{t.loggingIn}</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>{t.loginButton}</Text>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t.noAccount}</Text>
            <Pressable
              onPress={() => router.push('/signup' as any)}
              accessibilityRole="button"
            >
              <Text style={styles.switchLink}>{t.createAccount}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.guestButton}
          onPress={() => router.replace('/(tabs)/(home)' as any)}
          accessibilityRole="button"
        >
          <Text style={styles.guestButtonText}>{t.guestButton}</Text>
        </Pressable>
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.deepNight,
  },
  showHideButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  showHideText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green,
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
  guestButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  guestButtonText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
});
