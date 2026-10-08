import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const badgeStyles = {
  accent: {
    bg: colors.accentMuted,
    text: colors.ink,
    border: colors.accent,
  },
  success: {
    bg: colors.greenSoft,
    text: colors.green,
    border: 'transparent',
  },
  warning: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: 'transparent',
  },
  danger: {
    bg: '#FEE2E2',
    text: '#991B1B',
    border: 'transparent',
  },
  neutral: {
    bg: '#F3F4F6',
    text: colors.muted,
    border: colors.line,
  },
} as const;

export function Badge({
  label,
  variant = 'accent',
  style,
  textStyle,
}: {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const cfg = badgeStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          borderWidth: cfg.border === 'transparent' ? 0 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: cfg.text }, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
  },
});
