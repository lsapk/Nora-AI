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
  onPress?: () => void;
  onLongPress?: () => void;
  isDragging?: boolean;
}

export default function NoteCard({ id, title, content, updated_at, color, pinned, labels, onPress, onLongPress, isDragging }: NoteCardProps) {
  const router = useRouter();
  const isLight = !color || color === '#FFFFFF' || color === '#F2F2F7';
  const textColor = isLight ? '#111827' : '#F8FAFC';

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={[
        styles.card,
        {
          backgroundColor: color || '#FFFFFF',
          borderColor: isDragging ? '#8CB2FF' : isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.18)',
          transform: [{ scale: isDragging ? 0.985 : 1 }],
        },
      ]}
      onPress={onPress || (() => router.push(`/editor/${id}`))}
      onLongPress={onLongPress}
      delayLongPress={220}
    >
      <View style={styles.rowTop}>
        {title ? <Text style={[styles.title, { color: textColor }]} numberOfLines={3}>{title}</Text> : <Text style={[styles.emptyTitle, { color: textColor }]}>Note rapide</Text>}
        {pinned ? <Pin size={14} color={textColor} /> : null}
      </View>

      <Text style={[styles.content, { color: textColor }]} numberOfLines={8}>
        {content || 'Aucun contenu'}
      </Text>

      {!!labels?.length && <Text style={[styles.labels, { color: textColor }]}>#{labels.join(' #')}</Text>}
      <Text style={[styles.date, { color: textColor }]}>{new Date(updated_at).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    minHeight: 148,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  emptyTitle: { fontSize: 15, opacity: 0.6, fontWeight: '600', flex: 1 },
  content: { fontSize: 15, lineHeight: 22 },
  labels: { marginTop: 8, fontSize: 12.5, opacity: 0.9 },
  date: { fontSize: 12, marginTop: 10, opacity: 0.72 },
});
