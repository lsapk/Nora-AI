import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Menu, Search, Plus, Bell, Archive, Trash2, Settings, HelpCircle, StickyNote, LogOut, ChevronRight } from 'lucide-react-native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import NoteCard from '../../components/NoteCard';

export default function NotesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      .insert({ user_id: user?.id, content: '', note_color: '#FFFFFF', labels: [] } as any)
      .select()
      .single();

    if (data?.id) router.push(`/editor/${data.id}`);
  };

  const onComingSoon = (label: string) => {
    setDrawerOpen(false);
    Alert.alert(label, 'Cette section arrive bientôt.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heroHeader}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setDrawerOpen(true)}>
          <Menu size={20} color="#E5E7EB" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nora AI</Text>
          <Text style={styles.subtitle}>Notes intelligentes, rapides, fluides</Text>
        </View>
      </View>

      <BlurView intensity={45} tint="dark" style={styles.searchWrap}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </BlurView>

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
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: insets.bottom + 112 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#D1D5DB" />}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Aucune note pour le moment</Text> : null}
      />

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={createNote}>
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
          <BlurView intensity={55} tint="dark" style={[styles.drawer, { paddingTop: insets.top + 10 }]}> 
            <Text style={styles.drawerTitle}>Nora AI</Text>
            <Text style={styles.drawerSubtitle}>{user?.email || 'Connecté'}</Text>

            <DrawerItem icon={<StickyNote size={19} color="#E5E7EB" />} label="Notes" active onPress={() => setDrawerOpen(false)} />
            <DrawerItem icon={<Bell size={19} color="#E5E7EB" />} label="Rappels" onPress={() => onComingSoon('Rappels')} />
            <DrawerItem icon={<Archive size={19} color="#E5E7EB" />} label="Archives" onPress={() => onComingSoon('Archives')} />
            <DrawerItem icon={<Trash2 size={19} color="#E5E7EB" />} label="Corbeille" onPress={() => onComingSoon('Corbeille')} />
            <DrawerItem icon={<Settings size={19} color="#E5E7EB" />} label="Paramètres" onPress={() => { setDrawerOpen(false); router.push('/(tabs)/two'); }} />
            <DrawerItem icon={<HelpCircle size={19} color="#E5E7EB" />} label="Aide" onPress={() => onComingSoon('Aide')} />
            <DrawerItem icon={<LogOut size={19} color="#E5E7EB" />} label="Se déconnecter" onPress={async () => { setDrawerOpen(false); await supabase.auth.signOut(); }} />
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DrawerItem({ icon, label, active = false, onPress }: { icon: React.ReactNode; label: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.drawerItem, active && styles.drawerItemActive]}>
      <View style={{ width: 24 }}>{icon}</View>
      <Text style={styles.drawerText}>{label}</Text>
      <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090B10' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  title: { color: '#F9FAFB', fontSize: 27, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 12.5, marginTop: 2 },
  searchWrap: {
    marginHorizontal: 14,
    marginTop: 12,
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: { flex: 1, color: '#F3F4F6', fontSize: 15.5 },
  columnWrapper: { justifyContent: 'space-between' },
  noteWrapper: { flex: 0.488 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 70 },
  fab: {
    position: 'absolute',
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-start' },
  drawer: {
    width: '84%',
    height: '100%',
    borderTopRightRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  drawerTitle: { color: '#F3F4F6', fontSize: 30 / 1.2, fontWeight: '700' },
  drawerSubtitle: { color: '#9CA3AF', marginTop: 2, marginBottom: 18 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 7,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  drawerItemActive: { backgroundColor: 'rgba(37,99,235,0.7)' },
  drawerText: { color: '#F3F4F6', fontSize: 15.5, flex: 1 },
});
