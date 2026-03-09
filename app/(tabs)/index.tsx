import React, { useMemo, useState, useCallback } from 'react';
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
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Search, Plus, Archive, Settings, StickyNote, LogOut, Tag, Trash2, ArrowLeft, Check } from 'lucide-react-native';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import NoteCard from '../../components/NoteCard';
import Colors from '../../constants/Colors';

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
  archived?: boolean;
};

export default function NotesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

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
    useCallback(() => {
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
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter((note) =>
          (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q)
        );
      }
      return filtered;
    },
    [notes, selectedLabel, search]
  );

  const masonryData = useMemo(() => {
    const leftCol: NoteRow[] = [];
    const rightCol: NoteRow[] = [];
    filteredNotes.forEach((note, index) => {
      if (index % 2 === 0) leftCol.push(note);
      else rightCol.push(note);
    });
    return { leftCol, rightCol };
  }, [filteredNotes]);

  const createNote = async () => {
    const { data } = await supabase
      .from('notes')
      .insert({
        user_id: user?.id,
        content: '',
        note_color: colorScheme === 'dark' ? '#000000' : '#ffffff',
        labels: selectedLabel ? [selectedLabel] : [],
        order_index: notes.length > 0 ? Math.min(...notes.map((n: any) => n.order_index ?? 0)) - 1 : 0
      } as any)
      .select()
      .single();
    if (data?.id) router.push(`/editor/${data.id}`);
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    const { error } = await supabase.from('notes').insert({
        user_id: user?.id,
        content: '',
        title: '',
        labels: [newLabelName.trim()],
        archived: true,
        note_color: colorScheme === 'dark' ? '#000000' : '#ffffff'
    });
    if (error) Alert.alert('Erreur', error.message);
    setNewLabelName('');
    refetch();
  };

  const handleDeleteLabel = async (label: string) => {
    Alert.alert('Supprimer le libellé', `Voulez-vous supprimer le libellé "${label}" de toutes les notes ?`, [
        { text: 'Annuler', style: 'cancel' },
        {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
                const { data } = await supabase.from('notes').select('id, labels').contains('labels', [label]);
                if (data) {
                    for (const n of data) {
                        const newLabels = (n.labels as string[]).filter(l => l !== label);
                        await supabase.from('notes').update({ labels: newLabels }).eq('id', n.id);
                    }
                }
                refetch();
            }
        }
    ]);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: theme.card }]} onPress={() => setDrawerOpen(true)}>
            <Menu size={22} color={theme.icon} />
          </TouchableOpacity>
          <View style={[styles.searchWrap, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Search size={18} color={theme.subtext} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Rechercher"
              placeholderTextColor={theme.subtext}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {showArchived ? 'Archives' : (selectedLabel || 'Mes Notes')}
        </Text>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: insets.bottom + 112 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.tint} />}
        >
          <View style={styles.masonryContainer}>
            <View style={styles.column}>
              {masonryData.leftCol.map(item => (
                <NoteCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  content={(item.content || '').replace(/<[^>]*>?/gm, '')}
                  updated_at={item.updated_at}
                  color={item.note_color}
                  pinned={item.pinned}
                  labels={item.labels}
                  onPress={() => router.push(`/editor/${item.id}`)}
                />
              ))}
            </View>
            <View style={styles.column}>
              {masonryData.rightCol.map(item => (
                <NoteCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  content={(item.content || '').replace(/<[^>]*>?/gm, '')}
                  updated_at={item.updated_at}
                  color={item.note_color}
                  pinned={item.pinned}
                  labels={item.labels}
                  onPress={() => router.push(`/editor/${item.id}`)}
                />
              ))}
            </View>
          </View>
          {filteredNotes.length === 0 && !isLoading && <Text style={[styles.emptyText, { color: theme.subtext }]}>Aucune note</Text>}
        </ScrollView>

        {!showArchived && (
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 24, backgroundColor: theme.fab, shadowColor: theme.text }]}
            onPress={createNote}
          >
            <Plus size={32} color={theme.fabIcon} />
          </TouchableOpacity>
        )}

        <Modal visible={drawerOpen} transparent animationType="fade">
          <View style={styles.drawerOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
            <View style={[styles.drawer, { paddingTop: insets.top + 20, backgroundColor: theme.drawer }]}>
              <View style={styles.drawerHeader}>
                <Text style={[styles.drawerTitle, { color: theme.text }]}>Nora AI</Text>
                <Text style={[styles.drawerSubtitle, { color: theme.subtext }]}>{user?.email}</Text>
              </View>

              <DrawerItem
                icon={<StickyNote size={20} color={theme.icon} />}
                label="Toutes les notes"
                active={!selectedLabel && !showArchived}
                theme={theme}
                onPress={() => { setSelectedLabel(null); setShowArchived(false); setDrawerOpen(false); }}
              />
              <View style={[styles.drawerDivider, { backgroundColor: theme.border }]} />

              <View style={styles.drawerSectionHeader}>
                <Text style={[styles.drawerSectionLabel, { color: theme.subtext }]}>Libellés</Text>
                <TouchableOpacity onPress={() => { setDrawerOpen(false); setLabelModalOpen(true); }}>
                  <Settings size={16} color={theme.tint} />
                </TouchableOpacity>
              </View>

              {allLabels.map(label => (
                <DrawerItem
                  key={label}
                  icon={<Tag size={18} color={theme.icon} />}
                  label={label}
                  active={selectedLabel?.toLowerCase() === label.toLowerCase()}
                  theme={theme}
                  onPress={() => { setSelectedLabel(label); setShowArchived(false); setDrawerOpen(false); }}
                />
              ))}

              <View style={[styles.drawerDivider, { backgroundColor: theme.border }]} />

              <DrawerItem
                icon={<Archive size={20} color={theme.icon} />}
                label="Archives"
                active={showArchived}
                theme={theme}
                onPress={() => { setShowArchived(true); setSelectedLabel(null); setDrawerOpen(false); }}
              />
              <DrawerItem
                icon={<Settings size={20} color={theme.icon} />}
                label="Paramètres"
                theme={theme}
                onPress={() => { setDrawerOpen(false); router.push('/(tabs)/two'); }}
              />
              <DrawerItem
                icon={<LogOut size={20} color="#FF453A" />}
                label="Se déconnecter"
                theme={theme}
                onPress={async () => { setDrawerOpen(false); await supabase.auth.signOut(); }}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={labelModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setLabelModalOpen(false)} />
            <View style={[styles.modalContent, { backgroundColor: theme.drawer }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setLabelModalOpen(false)}>
                  <ArrowLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Modifier les libellés</Text>
              </View>

              <View style={[styles.modalInputRow, { borderBottomColor: theme.border }]}>
                <Plus size={20} color={theme.subtext} />
                <TextInput
                  placeholder="Créer un libellé"
                  placeholderTextColor={theme.subtext}
                  style={[styles.modalInput, { color: theme.text }]}
                  value={newLabelName}
                  onChangeText={setNewLabelName}
                  onSubmitEditing={handleCreateLabel}
                />
                <TouchableOpacity onPress={handleCreateLabel}>
                  <Check size={20} color={theme.tint} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {allLabels.map(l => (
                  <View key={l} style={styles.modalRow}>
                    <Tag size={18} color={theme.subtext} />
                    <TextInput
                      style={[styles.labelEditInput, { color: theme.text }]}
                      value={l}
                      editable={false}
                    />
                    <TouchableOpacity onPress={() => handleDeleteLabel(l)}>
                      <Trash2 size={18} color={theme.subtext} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function DrawerItem({ icon, label, active = false, onPress, theme }: { icon: React.ReactNode; label: string; active?: boolean; onPress?: () => void, theme: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.drawerItem, active && { backgroundColor: theme.tint + '15' }]}>
      <View style={{ width: 28 }}>{icon}</View>
      <Text style={[styles.drawerText, { color: theme.text }, active && { color: theme.tint, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10 },
  menuBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flex: 1, height: 44, borderRadius: 22, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '500', marginTop: 20, marginHorizontal: 20, marginBottom: 12 },
  masonryContainer: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  column: { flex: 1, gap: 6 },
  emptyText: { textAlign: 'center', marginTop: 100, fontSize: 16 },
  fab: { position: 'absolute', right: 20, width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: { width: '82%', height: '100%', borderTopRightRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 16 },
  drawerHeader: { marginBottom: 24, paddingLeft: 8, marginTop: 12 },
  drawerTitle: { fontSize: 24, fontWeight: '700' },
  drawerSubtitle: { fontSize: 13, marginTop: 2 },
  drawerDivider: { height: 1, marginVertical: 12 },
  drawerSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 8, marginBottom: 8 },
  drawerSectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', paddingLeft: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 24, marginBottom: 2 },
  drawerText: { fontSize: 15, fontWeight: '500', marginLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { padding: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: 450 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '600' },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, borderBottomWidth: 1, paddingVertical: 8 },
  modalInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  labelEditInput: { flex: 1, fontSize: 16 },
});
