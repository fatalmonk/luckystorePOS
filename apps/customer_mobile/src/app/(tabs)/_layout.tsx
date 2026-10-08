import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '../../theme';

export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor={colors.surface} indicatorColor={colors.greenSoft} tintColor={colors.green}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md={{ default: 'home', selected: 'home' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(shop)">
        <NativeTabs.Trigger.Label>Shop</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md={{ default: 'grid_view', selected: 'grid_view' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(cart)">
        <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} md={{ default: 'shopping_cart', selected: 'shopping_cart' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(account)">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md={{ default: 'person', selected: 'person' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
