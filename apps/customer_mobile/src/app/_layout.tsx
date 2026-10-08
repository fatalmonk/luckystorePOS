import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppDrawer } from '../components/navigation/app-drawer';
import { AuthProvider } from '../state/auth-context';
import { CartProvider } from '../state/cart-context';
import { TabBarScrollProvider } from '../state/tab-bar-scroll-context';
import { WishlistProvider } from '../state/wishlist-context';
import { colors } from '../theme';

const luckyTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.paper, primary: colors.green, text: colors.ink, border: colors.line },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <TabBarScrollProvider>
            <ThemeProvider value={luckyTheme}>
              <StatusBar style="dark" />
              <AppDrawer />
            <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: 'Sign In' }} />
              <Stack.Screen name="signup" options={{ title: 'Create Account' }} />
              <Stack.Screen name="orders" options={{ title: 'My Orders' }} />
              <Stack.Screen name="wishlist" options={{ title: 'Wishlist' }} />
              <Stack.Screen name="settings" options={{ title: 'Settings' }} />
              <Stack.Screen name="delivery" options={{ title: 'Delivery Info' }} />
              <Stack.Screen name="help" options={{ title: 'Help & Contact' }} />
              <Stack.Screen name="policies/privacy" options={{ title: 'Privacy Policy' }} />
              <Stack.Screen name="policies/terms" options={{ title: 'Terms of Service' }} />
              <Stack.Screen name="policies/security" options={{ title: 'Security Policy' }} />
              <Stack.Screen name="account/delete" options={{ title: 'Delete Account' }} />
              <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
              <Stack.Screen name="order/[number]" options={{ title: 'Order Details' }} />
              <Stack.Screen name="search" options={{ title: 'Search' }} />
              <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
              <Stack.Screen name="category/[slug]" options={{ title: 'Category' }} />
            </Stack>
            </ThemeProvider>
          </TabBarScrollProvider>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
