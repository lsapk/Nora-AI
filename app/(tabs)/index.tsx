import React, { useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  UIManager,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Search, Plus, Bell, Archive, Trash2, Settings, HelpCircle, StickyNote, LogOut, ChevronRight, Tag, Folder, GripVertical } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { useFolders } from '../../context/folder';
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const { data: notes = [], isLoading, refetch } = useQuery({
    queryKey: ['notes', user?.id, showArchived],
    queryFn: async () => {
      let query = supabase.from('notes').select('*').eq('user_id', user?.id).eq('archived', showArchived).order('pinned', { ascending: false });
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

  const notesForFilter = useMemo(
    () => {
      let filtered = notes as NoteRow[];
      if (selectedLabel) {
        filtered = filtered.filter((note) => (note.labels || []).some((label) => label.toLowerCase() === selectedLabel.toLowerCase()));
      }
      if (selectedFolderId) {
        filtered = filtered.filter((note) => note.folder_id === selectedFolderId);
      }
      return filtered;
    },
    [notes, selectedLabel, selectedFolderId]
  );

  const filteredNotes = useMemo(
    () =>
      notesForFilter.filter((note) => {
        const q = search.toLowerCase();
        return (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q);
      }),
    [notesForFilter, search]
  );

  const hasPinned = useMemo(() => filteredNotes.some((note) => note.pinned), [filteredNotes]);

  const createNote = async () => {
    const { data } = await supabase
      .from('notes')
      .insert({
        user_id: user?.id,
        content: '',
        note_color: '#0F172A',
        labels: selectedLabel ? [selectedLabel] : [],
        folder_id: selectedFolderId,
        order_index: Date.now()
      } as any)
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

  const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, ' ');

  const createNewFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const folder = await createFolder(name);
    if (folder) {
      setNewFolderName('');
      setFolderModalOpen(false);
      setSelectedFolderId(folder.id);
      setSelectedLabel(null);
    }
  };

  const createLabel = async () => {
    const next = normalizeLabel(newLabelName);
    if (!next) return;
    if (allLabels.some((l) => l.toLowerCase() === next.toLowerCase())) {
      Alert.alert('Libellé', 'Ce libellé existe déjà.');
      return;
    }
    setNewLabelName('');
    setLabelModalOpen(false);
    setSelectedLabel(next);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Alert.alert('Libellé créé', `Le libellé “${next}” est prêt. Ajoute-le aux notes depuis l’éditeur.`);
  };

  const deleteLabel = async (labelToDelete: string) => {
    const impacted = (notes as NoteRow[]).filter((note) => (note.labels || []).some((l) => l.toLowerCase() === labelToDelete.toLowerCase()));
    for (const note of impacted) {
      const labels = (note.labels || []).filter((l) => l.toLowerCase() !== labelToDelete.toLowerCase());
      await supabase.from('notes').update({ labels }).eq('id', note.id).eq('user_id', user?.id);
    }
    if (selectedLabel?.toLowerCase() === labelToDelete.toLowerCase()) setSelectedLabel(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    refetch();
  };

  const addLabelShortcut = () => {
    setDrawerOpen(false);
    setLabelModalOpen(true);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

      <Text style={styles.sectionTitle}>
        {showArchived ? 'Archives' : (selectedLabel || (selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : (hasPinned ? 'Notes épinglées' : 'Toutes les notes')))}
      </Text>

      <DraggableFlatList
        data={filteredNotes}
        keyExtractor={(item: any) => item.id}
        onDragEnd={({ data }) => persistOrder(data.map(n => n.id))}
        renderItem={({ item, drag, isActive }: RenderItemParams<NoteRow>) => (
          <ScaleDecorator>
            <View style={[styles.noteWrapperFull, isActive && { zIndex: 999 }]}>
              <NoteCard
                id={item.id}
                title={item.title}
                content={item.content}
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
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 112 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#D1D5DB" />}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Aucune note pour le moment</Text> : null}
      />

      {!showArchived && (
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 18 }]} onPress={createNote}>
          <Plus size={34} color="#132039" />
        </TouchableOpacity>
      )}

      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
          <View style={[styles.drawer, { paddingTop: insets.top + 10 }]}> 
            <Text style={styles.drawerTitle}>Nora AI</Text>
            <Text style={styles.drawerSubtitle}>{user?.email || 'Connecté'}</Text>

            <DrawerItem icon={<StickyNote size={19} color="#E5E7EB" />} label="Notes" active={!selectedLabel && !selectedFolderId && !showArchived} onPress={() => { setSelectedLabel(null); setSelectedFolderId(null); setShowArchived(false); setDrawerOpen(false); }} />

            <View style={styles.drawerDivider} />
            <View style={styles.labelHeader}>
              <Text style={styles.labelHeaderTitle}>Dossiers</Text>
            </View>

            {folders.map((folder) => (
              <DrawerItem
                key={folder.id}
                icon={<Folder size={18} color="#E5E7EB" />}
                label={folder.name}
                active={selectedFolderId === folder.id}
                onPress={() => {
                  setSelectedFolderId(folder.id);
                  setSelectedLabel(null);
                  setDrawerOpen(false);
                }}
              />
            ))}
            <DrawerItem icon={<Plus size={18} color="#E5E7EB" />} label="Nouveau dossier" onPress={() => { setDrawerOpen(false); setFolderModalOpen(true); }} />

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
            <DrawerItem icon={<Tag size={18} color="#E5E7EB" />} label="Gérer les libellés" onPress={() => { setDrawerOpen(false); setLabelModalOpen(true); }} />

            <View style={styles.drawerDivider} />
            <DrawerItem icon={<Archive size={19} color="#E5E7EB" />} label="Archives" active={showArchived} onPress={() => { setShowArchived(true); setSelectedLabel(null); setSelectedFolderId(null); setDrawerOpen(false); }} />
            <DrawerItem icon={<Settings size={19} color="#E5E7EB" />} label="Paramètres" onPress={() => { setDrawerOpen(false); router.push('/(tabs)/two'); }} />
            <DrawerItem icon={<HelpCircle size={19} color="#E5E7EB" />} label="Aide" onPress={() => onComingSoon('Aide')} />
            <DrawerItem icon={<LogOut size={19} color="#E5E7EB" />} label="Se déconnecter" onPress={async () => { setDrawerOpen(false); await supabase.auth.signOut(); }} />
          </View>
        </View>
      </Modal>

      <Modal visible={folderModalOpen} transparent animationType="fade" onRequestClose={() => setFolderModalOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setFolderModalOpen(false)} />
          <View style={styles.labelModal}>
            <Text style={styles.labelModalTitle}>Gérer les dossiers</Text>
            <View style={styles.labelInputRow}>
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="Nouveau dossier"
                placeholderTextColor="#9CA3AF"
                style={styles.labelInput}
              />
              <TouchableOpacity style={styles.labelCreateBtn} onPress={createNewFolder}>
                <Plus size={18} color="#0C101A" />
              </TouchableOpacity>
            </View>

            {folders.map((folder) => (
              <View key={folder.id} style={styles.labelRow}>
                <Text style={styles.labelRowText}>{folder.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={styles.labelAction} onPress={() => deleteFolder(folder.id)}><Text style={styles.labelActionText}>Supprimer</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={labelModalOpen} transparent animationType="fade" onRequestClose={() => setLabelModalOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setLabelModalOpen(false)} />
          <View style={styles.labelModal}>
            <Text style={styles.labelModalTitle}>Gérer les libellés</Text>
            <View style={styles.labelInputRow}>
              <TextInput
                value={newLabelName}
                onChangeText={setNewLabelName}
                placeholder="Nouveau libellé"
                placeholderTextColor="#9CA3AF"
                style={styles.labelInput}
              />
              <TouchableOpacity style={styles.labelCreateBtn} onPress={createLabel}>
                <Plus size={18} color="#0C101A" />
              </TouchableOpacity>
            </View>

            {allLabels.map((label) => (
              <View key={label} style={styles.labelRow}>
                <Text style={styles.labelRowText}>{label}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={styles.labelAction} onPress={() => deleteLabel(label)}><Text style={styles.labelActionText}>Supprimer</Text></TouchableOpacity>
                </View>
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
  noteWrapperFull: { width: '100%' },
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
  labelModal: {
    marginTop: 120,
    marginHorizontal: 18,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  labelModalTitle: { color: '#F9FAFB', fontSize: 21, fontWeight: '700' },
  labelInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  labelInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  labelCreateBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#AFC8FF',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  labelRowText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
  labelAction: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  labelActionText: { color: '#E5E7EB', fontSize: 12 },
});
