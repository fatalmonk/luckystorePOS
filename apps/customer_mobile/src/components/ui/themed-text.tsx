import { Text, TextProps } from 'react-native';
import { type } from '../../theme';

export type TextVariant = keyof typeof type;

export function ThemedText({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: TextVariant }) {
  return <Text style={[type[variant], style]} {...props} />;
}
