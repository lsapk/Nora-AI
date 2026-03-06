import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Pin } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

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

  const isDefaultColor = !color || color === '#0F172A' || color === '#0B1020' || color === '#000000';
  const cardBackground = isDefaultColor ? '#1C1C1E' : color;
  const textColor = '#FFF';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.cardContainer,
        {
          transform: [{ scale: isDragging ? 1.05 : 1 }],
          zIndex: isDragging ? 100 : 1,
        },
      ]}
      onPress={onPress || (() => router.push(`/editor/${id}`))}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      <View style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderColor: isDragging ? '#007AFF' : 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        }
      ]}>
        <View style={styles.rowTop}>
          {title ? (
            <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
              {title}
            </Text>
          ) : (
            <Text style={[styles.emptyTitle, { color: 'rgba(255,255,255,0.4)' }]}>
              Sans titre
            </Text>
          )}
          {pinned && <Pin size={14} color="#007AFF" fill="#007AFF" />}
        </View>

        <Text style={[styles.content, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={10}>
          {content || 'Aucun contenu supplémentaire'}
        </Text>

        <View style={styles.footer}>
          {!!labels?.length && (
            <View style={styles.labelContainer}>
              {labels.slice(0, 2).map((label, idx) => (
                <View key={idx} style={styles.labelBadge}>
                  <Text style={styles.labelText}>#{label}</Text>
                </View>
              ))}
              {labels.length > 2 && <Text style={styles.moreLabels}>+{labels.length - 2}</Text>}
            </View>
          )}
          <Text style={styles.date}>
            {new Date(updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 12,
    padding: 12,
    minHeight: 60,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    fontStyle: 'italic',
  },
  content: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  labelBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labelText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  moreLabels: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  date: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
});
