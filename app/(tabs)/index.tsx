import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Menu, Search, LayoutGrid, ArrowUpDown, Plus, Bell, Archive, Trash2, Settings, HelpCircle } from 'lucide-react-native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import NoteCard from '../../components/NoteCard';

export default function NotesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: notes = [], isLoading, refetch } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user?.id)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filteredNotes = useMemo(
    () =>
      notes.filter((note: any) => {
        const q = search.toLowerCase();
        return note.title?.toLowerCase().includes(q) || note.content?.toLowerCase().includes(q);
      }),
    [notes, search]
  );

  const createNote = async () => {
    const { data } = await supabase
      .from('notes')
      .insert({ user_id: user?.id, content: '', note_color: isDark ? '#111827' : '#FFFFFF', labels: [] } as any)
      .select()
      .single();

    if (data?.id) router.push(`/editor/${data.id}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#111827' }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setDrawerOpen(true)}>
          <Menu size={22} color="#F3F4F6" />
        </TouchableOpacity>

        <BlurView intensity={35} tint="dark" style={styles.searchWrap}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher dans Keep"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          <LayoutGrid size={18} color="#D1D5DB" />
          <ArrowUpDown size={18} color="#D1D5DB" />
        </BlurView>

        <View style={styles.avatar}><Text style={styles.avatarText}>P</Text></View>
      </View>

      <FlatList
        data={filteredNotes}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
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
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: insets.bottom + 110 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#D1D5DB" />}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Aucune note</Text> : null}
      />

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={createNote}>
        <Plus size={34} color="#0F172A" />
      </TouchableOpacity>

      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
          <View style={[styles.drawer, { paddingTop: insets.top + 12 }]}> 
            <Text style={styles.drawerTitle}>Google Keep</Text>
            <DrawerItem icon={<Bell size={20} color="#E5E7EB" />} label="Notes" active />
            <DrawerItem icon={<Bell size={20} color="#E5E7EB" />} label="Rappels" />
            <DrawerItem icon={<Archive size={20} color="#E5E7EB" />} label="Archives" />
            <DrawerItem icon={<Trash2 size={20} color="#E5E7EB" />} label="Corbeille" />
            <DrawerItem icon={<Settings size={20} color="#E5E7EB" />} label="Paramètres" />
            <DrawerItem icon={<HelpCircle size={20} color="#E5E7EB" />} label="Aide et commentaires" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DrawerItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <View style={[styles.drawerItem, active && styles.drawerItemActive]}>
      <View style={{ width: 26 }}>{icon}</View>
      <Text style={styles.drawerText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, overflow: 'hidden' },
  searchInput: { flex: 1, color: '#F3F4F6', fontSize: 20 / 1.1 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#166534', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '700' },
  columnWrapper: { justifyContent: 'space-between' },
  noteWrapper: { flex: 0.49 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 80 },
  fab: {
    position: 'absolute', right: 18, width: 76, height: 76, borderRadius: 22,
    backgroundColor: '#BFD2FF', justifyContent: 'center', alignItems: 'center',
  },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-start' },
  drawer: {
    width: '82%', height: '100%', backgroundColor: '#070B15', borderTopRightRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 16,
  },
  drawerTitle: { color: '#F3F4F6', fontSize: 38 / 1.8, fontWeight: '700', marginBottom: 16 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6 },
  drawerItemActive: { backgroundColor: '#3B82F6' },
  drawerText: { color: '#F3F4F6', fontSize: 17 },
});
