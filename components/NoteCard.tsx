import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Pin } from 'lucide-react-native';
import Colors from '@/constants/Colors';

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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Logic to determine background color
  const isDefaultColor = !color || color === '#000000' || color === '#ffffff' || color === '#0F172A' || color === '#0B1020';
  const cardBackground = isDefaultColor ? theme.card : color;

  // High contrast text colors based on background
  const textColor = theme.text;
  const subtextColor = theme.subtext;

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
          borderColor: isDragging ? theme.tint : theme.border,
          borderWidth: isDefaultColor ? 1 : 0.5,
        }
      ]}>
        <View style={styles.rowTop}>
          {title ? (
            <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
              {title}
            </Text>
          ) : null}
          {pinned && <Pin size={14} color={theme.tint} fill={theme.tint} />}
        </View>

        {content ? (
          <Text style={[styles.content, { color: textColor, opacity: 0.88 }]} numberOfLines={12}>
            {content}
          </Text>
        ) : !title ? (
          <Text style={[styles.emptyTitle, { color: subtextColor }]}>
            Note vide
          </Text>
        ) : null}

        <View style={styles.footer}>
          {!!labels?.length && (
            <View style={styles.labelContainer}>
              {labels.slice(0, 3).map((label, idx) => (
                <View key={idx} style={[styles.labelBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <Text style={[styles.labelText, { color: subtextColor }]}>{label}</Text>
                </View>
              ))}
              {labels.length > 3 && <Text style={[styles.moreLabels, { color: subtextColor }]}>+{labels.length - 3}</Text>}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 8,
    borderRadius: 12,
  },
  card: {
    borderRadius: 8,
    padding: 12,
    minHeight: 40,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  content: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  labelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  labelText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreLabels: {
    fontSize: 10,
  },
});
