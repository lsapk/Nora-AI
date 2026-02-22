import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Pin } from 'lucide-react-native';

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  color?: string;
  pinned?: boolean;
  labels?: string[];
}

export default function NoteCard({ id, title, content, updated_at, color, pinned, labels }: NoteCardProps) {
  const router = useRouter();
  const isLight = !color || color === '#FFFFFF' || color === '#F2F2F7';
  const textColor = isLight ? '#1C1C1E' : '#F5F5F7';

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: color || '#FFFFFF' }]} onPress={() => router.push(`/editor/${id}`)}>
      <View style={styles.rowTop}>
        {title ? <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>{title}</Text> : null}
        {pinned ? <Pin size={14} color={textColor} /> : null}
      </View>
      <Text style={[styles.content, { color: textColor }]} numberOfLines={5}>{content}</Text>
      {!!labels?.length && <Text style={[styles.labels, { color: textColor }]}>#{labels.join(' #')}</Text>}
      <Text style={[styles.date, { color: textColor }]}>{new Date(updated_at).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 120,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30 / 2, fontWeight: '700', marginBottom: 6, flex: 1 },
  content: { fontSize: 15, lineHeight: 20 },
  labels: { marginTop: 8, fontSize: 12, opacity: 0.9 },
  date: { fontSize: 11, marginTop: 10, opacity: 0.7 },
});
