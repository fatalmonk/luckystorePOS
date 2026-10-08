import { Stack } from 'expo-router';

export default function CartLayout() {
  return <Stack screenOptions={{ headerLargeTitle: true }}><Stack.Screen name="index" options={{ title: 'Cart' }} /></Stack>;
}
