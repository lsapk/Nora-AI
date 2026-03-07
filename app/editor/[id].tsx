import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Palette,
  Type,
  MoreVertical,
  Check,
  Trash2,
  Pin,
  Sparkles,
  Folder,
  Archive,
  Bold,
  Italic,
  Underline,
  List,
  ListTodo,
  Heading1,
  Heading2,
  ChevronDown,
  Plus,
  Tag
} from 'lucide-react-native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import AIChatOverlay from '../../components/AIChatOverlay';
import { getAIResponse } from '../../lib/ai';

type Note = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  note_color?: string | null;
  labels?: string[] | null;
  pinned?: boolean | null;
  archived?: boolean | null;
};

const NOTE_COLORS = [
  '#000000', // Default Black
  '#77172e', // Dark Red
  '#692b17', // Dark Orange
  '#7c5e10', // Dark Yellow
  '#265d48', // Dark Green
  '#256377', // Dark Cyan
  '#1e3a8a', // Dark Blue
  '#472e5b', // Dark Purple
  '#6c394f', // Dark Pink
  '#443126', // Dark Brown
  '#3c3f43', // Dark Gray
];

export default function EditorScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const noteId = useMemo(() => (Array.isArray(params.id) ? params.id[0] : params.id), [params.id]);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const richText = useRef<RichEditor>(null);

  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [noteColor, setNoteColor] = useState('#000000');
  const [labels, setLabels] = useState<string[]>([]);
  const [allUserLabels, setAllUserLabels] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  const [showPanel, setShowPanel] = useState<'none' | 'color' | 'more' | 'labels' | 'formatting'>('none');
  const [isAIChatVisible, setIsAIChatVisible] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

  const fetchNote = useCallback(async () => {
    if (!noteId || !user?.id) return setLoading(false);

    const { data, error } = await supabase.from('notes').select('*').eq('id', noteId).eq('user_id', user.id).single();
    if (error) {
      Alert.alert('Erreur', error.message);
      setLoading(false);
      return;
    }

    const n = data as Note;
    setNote(n);
    setTitle(n.title || '');
    const noteContent = n.content || '';
    setContent(noteContent);
    // CRITICAL FIX: Set editor content after fetch
    if (noteContent !== content) {
      richText.current?.setContentHTML(noteContent);
    }

    setNoteColor(n.note_color || '#000000');
    setLabels(n.labels || []);
    setIsPinned(Boolean(n.pinned));
    setIsArchived(Boolean(n.archived));
    setLoading(false);
  }, [noteId, user?.id]);

  const fetchAllLabels = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('notes').select('labels').eq('user_id', user.id);
    if (data) {
      const set = new Set<string>();
      data.forEach(n => (n.labels || []).forEach((l: string) => set.add(l.trim())));
      setAllUserLabels(Array.from(set).sort());
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNote();
    fetchAllLabels();
  }, [fetchNote, fetchAllLabels]);

  const saveNote = useCallback(
    async (nextTitle: string, nextContent: string, nextColor = noteColor, nextLabels = labels, nextPinned = isPinned, nextArchived = isArchived) => {
      if (!noteId || !user?.id) return;
      setIsSaving(true);

      const payload = {
        title: nextTitle,
        content: nextContent,
        note_color: nextColor,
        labels: nextLabels,
        pinned: nextPinned,
        archived: nextArchived,
        updated_at: new Date().toISOString(),
      } as any;

      const { error } = await supabase.from('notes').update(payload).eq('id', noteId).eq('user_id', user.id);

      setIsSaving(false);
      if (error) console.error('Erreur sauvegarde:', error.message);
    },
    [noteId, user?.id, noteColor, labels, isPinned, folderId, isArchived]
  );

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => saveNote(title, content, noteColor, labels, isPinned, isArchived), 1000);
    return () => clearTimeout(t);
  }, [title, content, noteColor, labels, isPinned, isArchived, note, saveNote]);

  const toggleLabel = (label: string) => {
    if (labels.includes(label)) {
      setLabels(labels.filter(l => l !== label));
    } else {
      setLabels([...labels, label]);
    }
  };

  const handleAddNewLabel = () => {
    const cleaned = newLabelName.trim();
    if (!cleaned) return;
    if (!labels.includes(cleaned)) {
      setLabels([...labels, cleaned]);
    }
    if (!allUserLabels.includes(cleaned)) {
      setAllUserLabels([...allUserLabels, cleaned].sort());
    }
    setNewLabelName('');
  };

  const archiveNote = async () => {
    setIsArchived(true);
    setTimeout(() => router.back(), 500);
  };

  const deleteNote = async () => {
    if (!isArchived) return archiveNote();
    Alert.alert('Supprimer', 'Voulez-vous supprimer définitivement cette note ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          if (!noteId || !user?.id) return;
          const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', user.id);
          if (error) return Alert.alert('Erreur', error.message);
          router.back();
        },
      },
    ]);
  };

  if (loading) return <View style={styles.center}><Text style={{color: '#fff'}}>Chargement...</Text></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: noteColor }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => setIsAIChatVisible(true)}>
              <Sparkles size={22} color="#FFF" />
            </TouchableOpacity>
            {!isArchived && (
              <TouchableOpacity onPress={() => setIsPinned(!isPinned)}>
                <Pin size={22} color={isPinned ? '#007AFF' : '#FFF'} fill={isPinned ? '#007AFF' : 'transparent'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowPanel('more')}>
              <MoreVertical size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre"
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={styles.titleInput}
            multiline
          />

          {labels.length > 0 && (
            <View style={styles.labelScroll}>
              {labels.map(l => (
                <TouchableOpacity key={l} style={styles.labelChip} onPress={() => toggleLabel(l)}>
                  <Text style={styles.labelChipText}>#{l} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <RichEditor
            ref={richText}
            initialContentHTML={content}
            onChange={(html) => {
              setContent(html);
            }}
            placeholder="Écrivez quelque chose..."
            editorStyle={{
              backgroundColor: noteColor,
              color: '#FFF',
              placeholderColor: 'rgba(255,255,255,0.2)',
              contentCSSText: 'font-size: 16px; line-height: 24px;',
            }}
            style={styles.richEditor}
            onLoad={() => {
              if (content) richText.current?.setContentHTML(content);
            }}
            useContainer={true}
            initialHeight={500}
          />
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
          <TouchableOpacity style={styles.barBtn} onPress={() => setShowPanel('formatting')}>
            <Plus size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.barBtn} onPress={() => setShowPanel('color')}>
            <Palette size={22} color="#FFF" />
          </TouchableOpacity>
          {!isArchived && (
            <TouchableOpacity style={styles.barBtn} onPress={archiveNote}>
              <Archive size={22} color="#FFF" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <Text style={styles.lastEdit}>
            Modifié {new Date(note?.updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.barBtn} onPress={() => setShowPanel('more')}>
            <MoreVertical size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {showPanel !== 'none' && (
          <View style={styles.panelOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowPanel('none')} />
            <View style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>
                  {showPanel === 'color' ? 'Couleur' : showPanel === 'labels' ? 'Libellés' : showPanel === 'formatting' ? 'Formatage' : 'Options'}
                </Text>
                <TouchableOpacity onPress={() => setShowPanel('none')}>
                  <ChevronDown size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              {showPanel === 'color' && (
                <View style={styles.colorGrid}>
                  {NOTE_COLORS.map(c => (
                    <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }]} onPress={() => { setNoteColor(c); setShowPanel('none'); }}>
                      {noteColor === c && <Check size={20} color="#FFF" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {showPanel === 'labels' && (
                <View style={{ gap: 20 }}>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={newLabelName}
                      onChangeText={setNewLabelName}
                      placeholder="Nouveau libellé..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={styles.panelInput}
                      onSubmitEditing={handleAddNewLabel}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddNewLabel}>
                      <Plus size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.labelList}>
                    {allUserLabels.map(l => (
                      <TouchableOpacity
                        key={l}
                        style={[styles.labelChoice, labels.includes(l) && styles.labelChoiceActive]}
                        onPress={() => toggleLabel(l)}
                      >
                        <Text style={[styles.labelChoiceText, labels.includes(l) && styles.labelChoiceTextActive]}>#{l}</Text>
                        {labels.includes(l) && <Check size={14} color="#FFF" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {showPanel === 'formatting' && (
                <View style={styles.formattingContainer}>
                   <RichToolbar
                    editor={richText}
                    actions={[
                      actions.setBold,
                      actions.setItalic,
                      actions.setUnderline,
                      actions.insertBulletsList,
                      actions.insertOrderedList,
                      actions.checkboxList,
                      actions.heading1,
                      actions.heading2,
                    ]}
                    iconMap={{
                      [actions.setBold]: ({ tintColor }) => <Bold size={20} color={tintColor} />,
                      [actions.setItalic]: ({ tintColor }) => <Italic size={20} color={tintColor} />,
                      [actions.setUnderline]: ({ tintColor }) => <Underline size={20} color={tintColor} />,
                      [actions.insertBulletsList]: ({ tintColor }) => <List size={20} color={tintColor} />,
                      [actions.checkboxList]: ({ tintColor }) => <ListTodo size={20} color={tintColor} />,
                      [actions.heading1]: ({ tintColor }) => <Heading1 size={20} color={tintColor} />,
                      [actions.heading2]: ({ tintColor }) => <Heading2 size={20} color={tintColor} />,
                    }}
                    selectedButtonStyle={{ backgroundColor: 'transparent' }}
                    unselectedButtonStyle={{ backgroundColor: 'transparent' }}
                    selectedIconTint="#007AFF"
                    iconTint="#FFF"
                    style={styles.richBar}
                  />
                </View>
              )}

              {showPanel === 'more' && (
                <View style={{ gap: 8 }}>
                  <PanelItem label="Libellés" onPress={() => setShowPanel('labels')} icon={<Tag size={20} color="#FFF" />} />
                  <PanelItem label="Partager la note" onPress={() => Share.share({ message: `${title}\n\n${content.replace(/<[^>]*>?/gm, '')}` })} icon={<Type size={20} color="#FFF" />} />
                  <PanelItem label={isArchived ? "Désarchiver" : "Archiver"} onPress={() => { setIsArchived(!isArchived); setShowPanel('none'); }} icon={<Archive size={20} color="#FFF" />} />
                  <PanelItem label="Supprimer" onPress={deleteNote} icon={<Trash2 size={20} color="#FF453A" />} />
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <AIChatOverlay
        isVisible={isAIChatVisible}
        onClose={() => setIsAIChatVisible(false)}
        isTyping={isAITyping}
        messages={aiMessages}
        onSendMessage={async (msg) => {
          setAiMessages(p => [...p, { role: 'user', content: msg }]);
          setIsAITyping(true);
          try {
            const res = await getAIResponse(content, msg);
            if (res) {
              setAiMessages(p => [...p, { role: 'ai', content: res.explanation }]);
              if (res.newContent) {
                setContent(res.newContent);
                richText.current?.setContentHTML(res.newContent);
              }
            }
          } finally {
            setIsAITyping(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

function PanelItem({ label, onPress, icon }: { label: string, onPress: () => void, icon?: any }) {
  return (
    <TouchableOpacity style={styles.panelItem} onPress={onPress}>
      <View style={{ width: 32 }}>{icon}</View>
      <Text style={styles.panelItemText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 60 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titleInput: { fontSize: 28, fontWeight: '700', color: '#FFF', letterSpacing: -0.5, marginBottom: 8, marginTop: 10, paddingVertical: 10, textAlignVertical: 'top' },
  richEditor: { flex: 1, minHeight: 400 },
  richBar: { backgroundColor: 'transparent', borderTopWidth: 0, borderBottomWidth: 0, width: '100%' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 50, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  barBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  lastEdit: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  labelScroll: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  formattingContainer: { paddingBottom: 10 },
  labelChip: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  labelChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  panelOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  panelTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  colorDot: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', gap: 12 },
  panelInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 16 },
  addBtn: { backgroundColor: '#007AFF', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  labelList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  labelChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  labelChoiceActive: { backgroundColor: 'rgba(0,122,255,0.2)', borderColor: '#007AFF' },
  labelChoiceText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500' },
  labelChoiceTextActive: { color: '#FFF', fontWeight: '700' },
  panelItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  panelItemText: { color: '#FFF', fontSize: 17, fontWeight: '500' },
});
