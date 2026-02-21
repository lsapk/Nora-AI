import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  color?: string;
}

export default function NoteCard({ id, title, content, updated_at, color }: NoteCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: color || (isDark ? '#1C1C1E' : '#FFFFFF') }
      ]}
      onPress={() => router.push(`/editor/${id}`)}
    >
      <View style={styles.contentContainer}>
        {title ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : null}
        <Text style={styles.content} numberOfLines={6}>
          {content}
        </Text>
        <Text style={styles.date}>
          {new Date(updated_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    minHeight: 120,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  content: {
    fontSize: 15,
    color: '#3A3A3C',
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 12,
  },
});
