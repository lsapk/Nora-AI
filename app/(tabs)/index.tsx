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
import { Menu, Search, Plus, Bell, Archive, Trash2, Settings, HelpCircle, StickyNote, LogOut, ChevronRight, Tag } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import NoteCard from '../../components/NoteCard';

type NoteRow = {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  note_color?: string;
  pinned?: boolean;
  labels?: string[];
  order_index?: number;
};

export default function NotesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const { data: notes = [], isLoading, refetch } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      let query = supabase.from('notes').select('*').eq('user_id', user?.id).order('pinned', { ascending: false });
      const { data, error } = await query.order('order_index', { ascending: true }).order('updated_at', { ascending: false });
      if (error && /order_index/i.test(error.message || '')) {
        const fallback = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user?.id)
          .order('pinned', { ascending: false })
          .order('updated_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        return fallback.data ?? [];
      }
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

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    (notes as NoteRow[]).forEach((note) => (note.labels || []).forEach((label) => set.add(label.trim())));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const notesForLabel = useMemo(
    () =>
      selectedLabel
        ? (notes as NoteRow[]).filter((note) => (note.labels || []).some((label) => label.toLowerCase() === selectedLabel.toLowerCase()))
        : (notes as NoteRow[]),
    [notes, selectedLabel]
  );

  const filteredNotes = useMemo(
    () =>
      notesForLabel.filter((note) => {
        const q = search.toLowerCase();
        return note.title?.toLowerCase().includes(q) || note.content?.toLowerCase().includes(q);
      }),
    [notesForLabel, search]
  );

  const hasPinned = useMemo(() => filteredNotes.some((note) => note.pinned), [filteredNotes]);

  const createNote = async () => {
    const { data } = await supabase
      .from('notes')
      .insert({ user_id: user?.id, content: '', note_color: '#FFFFFF', labels: selectedLabel ? [selectedLabel] : [], order_index: Date.now() } as any)
      .select()
      .single();

    if (data?.id) router.push(`/editor/${data.id}`);
  };

  const persistOrder = async (orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await supabase.from('notes').update({ order_index: i }).eq('id', orderedIds[i]).eq('user_id', user?.id);
      if (error && /order_index/i.test(error.message || '')) {
        Alert.alert('Ordre des notes', "Ajoute la colonne 'order_index' dans Supabase (schema.sql) pour mémoriser l'ordre.");
        return;
      }
    }
    refetch();
  };

  const onDropOnNote = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    if (search.trim() || selectedLabel) {
      setDraggingId(null);
      Alert.alert('Réorganisation', 'Pour déplacer les notes, enlève la recherche et le filtre de libellé.');
      return;
    }

    const all = [...(notes as NoteRow[])];
    const from = all.findIndex((n) => n.id === draggingId);
    const to = all.findIndex((n) => n.id === targetId);
    if (from === -1 || to === -1) {
      setDraggingId(null);
      return;
    }

    const [moved] = all.splice(from, 1);
    all.splice(to, 0, moved);
    setDraggingId(null);
    await persistOrder(all.map((n) => n.id));
  };

  const onComingSoon = (label: string) => {
    setDrawerOpen(false);
    Alert.alert(label, 'Cette section arrive bientôt.');
  };

  const addLabelShortcut = () => {
    setDrawerOpen(false);
    Alert.alert('Libellés', "Crée un libellé depuis l'éditeur (menu Plus > Libellés), puis il apparaîtra ici.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setDrawerOpen(true)}>
          <Menu size={21} color="#E5E7EB" />
        </TouchableOpacity>

        <BlurView intensity={26} tint="dark" style={styles.searchWrap}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={selectedLabel ? `Rechercher dans ${selectedLabel}` : 'Rechercher vos notes'}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </BlurView>
      </View>

      <Text style={styles.sectionTitle}>{selectedLabel || (hasPinned ? 'Notes épinglées' : 'Toutes les notes')}</Text>

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
              isDragging={draggingId === item.id}
              onLongPress={() => {
                if (search.trim() || selectedLabel) {
                  Alert.alert('Réorganisation', 'Enlève la recherche et le filtre de libellé pour déplacer une note.');
                  return;
                }
                setDraggingId(item.id);
              }}
              onPress={() => (draggingId ? onDropOnNote(item.id) : router.push(`/editor/${item.id}`))}
            />
          </View>
        )}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 112 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#D1D5DB" />}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Aucune note pour le moment</Text> : null}
      />

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 18 }]} onPress={createNote}>
        <Plus size={34} color="#132039" />
      </TouchableOpacity>

      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
          <View style={[styles.drawer, { paddingTop: insets.top + 10 }]}> 
            <Text style={styles.drawerTitle}>Nora AI</Text>
            <Text style={styles.drawerSubtitle}>{user?.email || 'Connecté'}</Text>

            <DrawerItem icon={<StickyNote size={19} color="#E5E7EB" />} label="Notes" active={!selectedLabel} onPress={() => { setSelectedLabel(null); setDrawerOpen(false); }} />
            <DrawerItem icon={<Bell size={19} color="#E5E7EB" />} label="Rappels" onPress={() => onComingSoon('Rappels')} />

            <View style={styles.drawerDivider} />
            <View style={styles.labelHeader}>
              <Text style={styles.labelHeaderTitle}>Libellés</Text>
            </View>

            {allLabels.map((label) => (
              <DrawerItem
                key={label}
                icon={<Tag size={18} color="#E5E7EB" />}
                label={label}
                active={selectedLabel?.toLowerCase() === label.toLowerCase()}
                onPress={() => {
                  setSelectedLabel(label);
                  setDrawerOpen(false);
                }}
              />
            ))}

            <DrawerItem icon={<Plus size={18} color="#E5E7EB" />} label="Nouveau libellé" onPress={addLabelShortcut} />

            <View style={styles.drawerDivider} />
            <DrawerItem icon={<Archive size={19} color="#E5E7EB" />} label="Archives" onPress={() => onComingSoon('Archives')} />
            <DrawerItem icon={<Trash2 size={19} color="#E5E7EB" />} label="Corbeille" onPress={() => onComingSoon('Corbeille')} />
            <DrawerItem icon={<Settings size={19} color="#E5E7EB" />} label="Paramètres" onPress={() => { setDrawerOpen(false); router.push('/(tabs)/two'); }} />
            <DrawerItem icon={<HelpCircle size={19} color="#E5E7EB" />} label="Aide" onPress={() => onComingSoon('Aide')} />
            <DrawerItem icon={<LogOut size={19} color="#E5E7EB" />} label="Se déconnecter" onPress={async () => { setDrawerOpen(false); await supabase.auth.signOut(); }} />
          </View>
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
  container: { flex: 1, backgroundColor: '#0C101A' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8 },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchWrap: {
    flex: 1,
    marginHorizontal: 2,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,32,44,0.78)',
  },
  searchInput: { flex: 1, color: '#F3F4F6', fontSize: 17 },
  sectionTitle: { color: '#E5E7EB', fontSize: 28, fontWeight: '700', marginTop: 14, marginHorizontal: 14, marginBottom: 8 },
  columnWrapper: { justifyContent: 'space-between' },
  noteWrapper: { flex: 0.488 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 70 },
  fab: {
    position: 'absolute',
    right: 16,
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#AFC8FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9FB7FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 14,
    elevation: 8,
  },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-start' },
  drawer: {
    backgroundColor: '#0C1322',
    width: '84%',
    height: '100%',
    borderTopRightRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  drawerTitle: { color: '#F3F4F6', fontSize: 25, fontWeight: '700' },
  drawerSubtitle: { color: '#9CA3AF', marginTop: 2, marginBottom: 14 },
  drawerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 10, marginHorizontal: 2 },
  labelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 10 },
  labelHeaderTitle: { color: '#D1D5DB', fontSize: 16, fontWeight: '600' },
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
  drawerItemActive: { backgroundColor: 'rgba(74,113,194,0.75)' },
  drawerText: { color: '#F3F4F6', fontSize: 15.5, flex: 1 },
});
