import { ActivityIndicator, Pressable, StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { ThemedText } from './themed-text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants = {
  primary: {
    bg: colors.accent,
    text: colors.ink,
    border: 'transparent',
  },
  secondary: {
    bg: colors.greenSoft,
    text: colors.green,
    border: 'transparent',
  },
  outline: {
    bg: 'transparent',
    text: colors.ink,
    border: colors.line,
  },
  danger: {
    bg: '#FEE2E2',
    text: colors.danger,
    border: 'transparent',
  },
  ghost: {
    bg: 'transparent',
    text: colors.muted,
    border: 'transparent',
  },
} as const;

const sizes = {
  sm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    minHeight: 44,
  },
  md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
} as const;

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  textStyle,
  onPress,
}: {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
}) {
  const cfg = variants[variant];
  const sizeCfg = sizes[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          borderWidth: cfg.border === 'transparent' ? 0 : 1,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          ...sizeCfg,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={cfg.text} size="small" />
      ) : (
        <ThemedText
          variant={size === 'sm' ? 'caption' : 'headline'}
          style={[{ color: cfg.text, fontWeight: '800' }, textStyle]}
        >
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
