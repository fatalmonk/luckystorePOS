import { Stack } from 'expo-router';

export default function AccountLayout() {
  return <Stack screenOptions={{ headerLargeTitle: true }}><Stack.Screen name="index" options={{ title: 'Account' }} /></Stack>;
}
