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
  const textColor = isLight ? '#111827' : '#F8FAFC';

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={[styles.card, { backgroundColor: color || '#FFFFFF', borderColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.16)' }]}
      onPress={() => router.push(`/editor/${id}`)}
    >
      <View style={styles.rowTop}>
        {title ? <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>{title}</Text> : <Text style={[styles.emptyTitle, { color: textColor }]}>Note rapide</Text>}
        {pinned ? <Pin size={14} color={textColor} /> : null}
      </View>

      <Text style={[styles.content, { color: textColor }]} numberOfLines={5}>
        {content || 'Aucun contenu'}
      </Text>

      {!!labels?.length && <Text style={[styles.labels, { color: textColor }]}>#{labels.join(' #')}</Text>}
      <Text style={[styles.date, { color: textColor }]}>{new Date(updated_at).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    minHeight: 132,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 15.5, fontWeight: '700', flex: 1, marginRight: 8 },
  emptyTitle: { fontSize: 14, opacity: 0.6, fontWeight: '600', flex: 1 },
  content: { fontSize: 14, lineHeight: 20 },
  labels: { marginTop: 8, fontSize: 12, opacity: 0.9 },
  date: { fontSize: 11.5, marginTop: 10, opacity: 0.7 },
});
