import { Stack } from 'expo-router';

export default function HomeLayout() {
  return <Stack screenOptions={{ headerLargeTitle: true }}><Stack.Screen name="index" options={{ title: 'Lucky Store' }} /></Stack>;
}
