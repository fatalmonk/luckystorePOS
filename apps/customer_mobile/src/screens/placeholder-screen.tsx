import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  return <View style={styles.container}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28, gap: 10, backgroundColor: colors.paper },
  title: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
});
