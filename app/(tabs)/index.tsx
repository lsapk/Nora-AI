import React, { useState } from 'react';
import { StyleSheet, View, FlatList, TextInput, ScrollView, RefreshControl, Text, useColorScheme } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import NoteCard from '../../components/NoteCard';
import { BlurView } from 'expo-blur';
import { Search, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function NotesScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { data: notes, isLoading, refetch } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user?.id)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredNotes = notes?.filter(note =>
    note.title?.toLowerCase().includes(search.toLowerCase()) ||
    note.content?.toLowerCase().includes(search.toLowerCase())
  );

  const createNote = async () => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user?.id, content: '', note_color: isDark ? '#0D111B' : '#FFFFFF', labels: [] } as any)
      .select()
      .single();

    if (data) {
      router.push(`/editor/${data.id}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Mes Notes</Text>
      </View>

      <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.searchBarContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
          placeholder="Rechercher..."
          placeholderTextColor="#8E8E93"
          value={search}
          onChangeText={setSearch}
        />
      </BlurView>

      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.noteWrapper}>
            <NoteCard
              id={item.id}
              title={item.title}
              content={item.content}
              updated_at={item.updated_at}
              color={item.note_color}
              pinned={item.pinned}
              labels={item.labels}
            />
          </View>
        )}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune note trouvée</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity style={styles.fab} onPress={createNote}>
        <Plus size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
  },
  listContent: {
    padding: 8,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  noteWrapper: {
    flex: 0.48,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 17,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
