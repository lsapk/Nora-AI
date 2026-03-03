import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  UIManager,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Search, Plus, Archive, Settings, StickyNote, LogOut, Tag, Folder, Trash2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { useFolders } from '../../context/folder';
import NoteCard from '../../components/NoteCard';

const { width } = Dimensions.get('window');

type NoteRow = {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  note_color?: string;
  pinned?: boolean;
  labels?: string[];
  order_index?: number;
  folder_id?: string;
  archived?: boolean;
};

export default function NotesScreen() {
  const { user } = useAuth();
  const { folders, createFolder, deleteFolder } = useFolders();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [labelModalOpen, setLabelModalOpen] = useState(false);

  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const { data: notes = [], isLoading, refetch } = useQuery({
    queryKey: ['notes', user?.id, showArchived],
    queryFn: async () => {
      let query = supabase.from('notes').select('*').eq('user_id', user?.id).eq('archived', showArchived).order('pinned', { ascending: false });
      const { data, error } = await query.order('order_index', { ascending: true }).order('updated_at', { ascending: false });
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

  const filteredNotes = useMemo(
    () => {
      let filtered = notes as NoteRow[];
      if (selectedLabel) {
        filtered = filtered.filter((note) => (note.labels || []).some((label) => label.toLowerCase() === selectedLabel.toLowerCase()));
      }
      if (selectedFolderId) {
        filtered = filtered.filter((note) => note.folder_id === selectedFolderId);
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter((note) =>
          (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q)
        );
      }
      return filtered;
    },
    [notes, selectedLabel, selectedFolderId, search]
  );

  const persistOrder = async (orderedIds: string[]) => {
    if (search || selectedLabel || selectedFolderId) return;
    const updates = orderedIds.map((id, index) => ({ id, user_id: user?.id, order_index: index }));
    await supabase.from('notes').upsert(updates as any, { onConflict: 'id' });
    refetch();
  };

  const createNote = async () => {
    const { data } = await supabase
      .from('notes')
      .insert({
        user_id: user?.id,
        content: '',
        note_color: '#000000',
        labels: selectedLabel ? [selectedLabel] : [],
        folder_id: selectedFolderId,
        order_index: notes.length > 0 ? Math.min(...notes.map((n: any) => n.order_index ?? 0)) - 1 : 0
      } as any)
      .select()
      .single();
    if (data?.id) router.push(`/editor/${data.id}`);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setFolderModalOpen(false);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setDrawerOpen(true)}>
            <Menu size={21} color="#E5E7EB" />
          </TouchableOpacity>
          <BlurView intensity={30} tint="dark" style={styles.searchWrap}>
            <Search size={18} color="#9CA3AF" />
            <TextInput style={styles.searchInput} placeholder="Rechercher" placeholderTextColor="rgba(255,255,255,0.4)" value={search} onChangeText={setSearch} />
          </BlurView>
        </View>

        <Text style={styles.sectionTitle}>
          {showArchived ? 'Archives' : (selectedLabel || (selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'Mes Notes'))}
        </Text>

        <DraggableFlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => persistOrder(data.map(n => n.id))}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item, drag, isActive }: RenderItemParams<NoteRow>) => (
            <ScaleDecorator>
              <View style={[styles.cardWrapper, isActive && { zIndex: 100 }]}>
                <NoteCard
                  id={item.id}
                  title={item.title}
                  content={(item.content || '').replace(/<[^>]*>?/gm, '')}
                  updated_at={item.updated_at}
                  color={item.note_color}
                  pinned={item.pinned}
                  labels={item.labels}
                  isDragging={isActive}
                  onLongPress={drag}
                  onPress={() => router.push(`/editor/${item.id}`)}
                />
              </View>
            </ScaleDecorator>
          )}
          contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: insets.bottom + 112 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#D1D5DB" />}
          ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Aucune note</Text> : null}
        />

        {!showArchived && (
          <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={createNote}>
            <Plus size={34} color="#000" />
          </TouchableOpacity>
        )}

        <Modal visible={drawerOpen} transparent animationType="fade">
          <View style={styles.drawerOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
            <View style={[styles.drawer, { paddingTop: insets.top + 20 }]}>
              <View style={styles.drawerHeader}><Text style={styles.drawerTitle}>Nora AI</Text><Text style={styles.drawerSubtitle}>{user?.email}</Text></View>
              <DrawerItem icon={<StickyNote size={20} color="#E5E7EB" />} label="Toutes les notes" active={!selectedLabel && !selectedFolderId && !showArchived} onPress={() => { setSelectedLabel(null); setSelectedFolderId(null); setShowArchived(false); setDrawerOpen(false); }} />
              <View style={styles.drawerDivider} />
              <View style={styles.drawerSectionHeader}><Text style={styles.drawerSectionLabel}>Dossiers</Text><TouchableOpacity onPress={() => { setDrawerOpen(false); setFolderModalOpen(true); }}><Plus size={16} color="#007AFF" /></TouchableOpacity></View>
              {folders.map(folder => <DrawerItem key={folder.id} icon={<Folder size={18} color="#E5E7EB" />} label={folder.name} active={selectedFolderId === folder.id} onPress={() => { setSelectedFolderId(folder.id); setSelectedLabel(null); setShowArchived(false); setDrawerOpen(false); }} />)}
              <View style={styles.drawerDivider} />
              <View style={styles.drawerSectionHeader}><Text style={styles.drawerSectionLabel}>Libellés</Text><TouchableOpacity onPress={() => { setDrawerOpen(false); setLabelModalOpen(true); }}><Settings size={16} color="#007AFF" /></TouchableOpacity></View>
              {allLabels.map(label => <DrawerItem key={label} icon={<Tag size={18} color="#E5E7EB" />} label={label} active={selectedLabel?.toLowerCase() === label.toLowerCase()} onPress={() => { setSelectedLabel(label); setSelectedFolderId(null); setShowArchived(false); setDrawerOpen(false); }} />)}
              <View style={styles.drawerDivider} />
              <DrawerItem icon={<Archive size={20} color="#E5E7EB" />} label="Archives" active={showArchived} onPress={() => { setShowArchived(true); setSelectedLabel(null); setSelectedFolderId(null); setDrawerOpen(false); }} />
              <DrawerItem icon={<Settings size={20} color="#E5E7EB" />} label="Paramètres" onPress={() => { setDrawerOpen(false); router.push('/(tabs)/two'); }} />
              <DrawerItem icon={<LogOut size={20} color="#FF453A" />} label="Se déconnecter" onPress={async () => { setDrawerOpen(false); await supabase.auth.signOut(); }} />
            </View>
          </View>
        </Modal>

        <Modal visible={folderModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setFolderModalOpen(false)} />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Dossiers</Text>
              <View style={styles.modalInputRow}>
                <TextInput placeholder="Nouveau dossier" placeholderTextColor="rgba(255,255,255,0.3)" style={styles.modalInput} value={newFolderName} onChangeText={setNewFolderName} />
                <TouchableOpacity style={styles.modalAddBtn} onPress={handleCreateFolder}><Plus size={20} color="#FFF" /></TouchableOpacity>
              </View>
              {folders.map(f => (
                <View key={f.id} style={styles.modalRow}>
                  <Text style={{color: '#FFF'}}>{f.name}</Text>
                  <TouchableOpacity onPress={() => deleteFolder(f.id)}><Trash2 size={18} color="#FF453A" /></TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={labelModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setLabelModalOpen(false)} />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Libellés</Text>
              {allLabels.map(l => (
                <View key={l} style={styles.modalRow}>
                  <Text style={{color: '#FFF'}}>#{l}</Text>
                </View>
              ))}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function DrawerItem({ icon, label, active = false, onPress }: { icon: React.ReactNode; label: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.drawerItem, active && styles.drawerItemActive]}>
      <View style={{ width: 28 }}>{icon}</View>
      <Text style={[styles.drawerText, active && styles.drawerTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10 },
  menuBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E' },
  searchWrap: { flex: 1, height: 44, borderRadius: 22, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, backgroundColor: '#1C1C1E' },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16 },
  sectionTitle: { color: '#FFF', fontSize: 32, fontWeight: '800', marginTop: 24, marginHorizontal: 20, marginBottom: 16, letterSpacing: -1 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 6 },
  cardWrapper: { width: (width - 44) / 2, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 100, fontSize: 16 },
  fab: { position: 'absolute', right: 20, width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#FFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  drawer: { backgroundColor: '#1C1C1E', width: '80%', height: '100%', borderTopRightRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 16 },
  drawerHeader: { marginBottom: 32, paddingLeft: 8 },
  drawerTitle: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  drawerSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 4 },
  drawerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  drawerSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 8, marginBottom: 12 },
  drawerSectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', paddingLeft: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderRadius: 16, marginBottom: 4 },
  drawerItemActive: { backgroundColor: 'rgba(0,122,255,0.15)' },
  drawerText: { color: '#E5E7EB', fontSize: 17, fontWeight: '500' },
  drawerTextActive: { color: '#007AFF', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, minHeight: 400 },
  modalTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 20 },
  modalInputRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  modalInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, color: '#FFF' },
  modalAddBtn: { backgroundColor: '#007AFF', width: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
});
