import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { FloatingGlassTabBar } from '../../components/navigation/floating-glass-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="(shop)"
        options={{
          title: 'Shop',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛍️</Text>,
        }}
      />
      <Tabs.Screen
        name="(cart)"
        options={{
          title: 'Cart',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛒</Text>,
        }}
      />
      <Tabs.Screen
        name="(account)"
        options={{
          title: 'Account',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
