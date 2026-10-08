import { Image, ImageStyle } from 'expo-image';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const logoMain = require('../../../assets/images/logo/logo-main.png');
const logoMainInverse = require('../../../assets/images/logo/logo-main-inverse.png');

export type LogoTheme = 'light' | 'dark';
export type LogoSize = 'sm' | 'md' | 'lg';

const SIZES = {
  sm: { width: 120, height: 28 },
  md: { width: 156, height: 36 },
  lg: { width: 200, height: 46 },
} as const;

export function Logo({
  theme = 'light',
  size = 'md',
  style,
  imageStyle,
}: {
  theme?: LogoTheme;
  size?: LogoSize;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}) {
  const dimensions = SIZES[size];
  const source = theme === 'dark' ? logoMainInverse : logoMain;

  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        contentFit="contain"
        style={[dimensions, imageStyle]}
        accessibilityRole="image"
        accessibilityLabel="Lucky Store 1947"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});
