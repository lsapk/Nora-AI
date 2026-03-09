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
  useColorScheme,
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
import Colors, { NOTE_COLORS } from '../../constants/Colors';

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

export default function EditorScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const noteId = useMemo(() => (Array.isArray(params.id) ? params.id[0] : params.id), [params.id]);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const richText = useRef<RichEditor>(null);

  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [noteColor, setNoteColor] = useState(colorScheme === 'dark' ? '#000000' : '#ffffff');
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
    if (noteContent !== content) {
      richText.current?.setContentHTML(noteContent);
    }

    setNoteColor(n.note_color || (colorScheme === 'dark' ? '#000000' : '#ffffff'));
    setLabels(n.labels || []);
    setIsPinned(Boolean(n.pinned));
    setIsArchived(Boolean(n.archived));
    setLoading(false);
  }, [noteId, user?.id, colorScheme]);

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
    [noteId, user?.id, noteColor, labels, isPinned, isArchived]
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

  // Determine if high contrast text is needed (Keep handles this well)
  const isDarkNote = noteColor !== '#ffffff' && noteColor !== '#FFFFFF' && noteColor !== '#e8eaed';
  const editorTextColor = colorScheme === 'dark' ? '#FFFFFF' : (isDarkNote ? '#202124' : '#202124');
  const placeholderColor = isDarkNote ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.4)';

  if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><Text style={{color: theme.text}}>Chargement...</Text></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: noteColor }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={editorTextColor} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => setIsAIChatVisible(true)}>
              <Sparkles size={22} color={editorTextColor} />
            </TouchableOpacity>
            {!isArchived && (
              <TouchableOpacity onPress={() => setIsPinned(!isPinned)}>
                <Pin size={22} color={isPinned ? theme.tint : editorTextColor} fill={isPinned ? theme.tint : 'transparent'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowPanel('more')}>
              <MoreVertical size={22} color={editorTextColor} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre"
            placeholderTextColor={placeholderColor}
            style={[styles.titleInput, { color: editorTextColor }]}
            multiline
          />

          {labels.length > 0 && (
            <View style={styles.labelScroll}>
              {labels.map(l => (
                <TouchableOpacity key={l} style={[styles.labelChip, { backgroundColor: 'rgba(0,0,0,0.05)' }]} onPress={() => toggleLabel(l)}>
                  <Text style={[styles.labelChipText, { color: editorTextColor }]}>{l} ✕</Text>
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
              color: editorTextColor,
              placeholderColor: placeholderColor,
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

        <View style={[styles.bottomBar, {
          paddingBottom: Math.max(insets.bottom, 16),
          height: 56 + Math.max(insets.bottom, 16),
          borderTopColor: 'rgba(0,0,0,0.1)'
        }]}>
          <TouchableOpacity style={styles.barBtn} onPress={() => setShowPanel('formatting')}>
            <Plus size={22} color={editorTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.barBtn} onPress={() => setShowPanel('color')}>
            <Palette size={22} color={editorTextColor} />
          </TouchableOpacity>
          {!isArchived && (
            <TouchableOpacity style={styles.barBtn} onPress={archiveNote}>
              <Archive size={22} color={editorTextColor} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <Text style={[styles.lastEdit, { color: editorTextColor, opacity: 0.6 }]}>
            Modifié {new Date(note?.updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.barBtn} onPress={() => setShowPanel('more')}>
            <MoreVertical size={22} color={editorTextColor} />
          </TouchableOpacity>
        </View>

        {showPanel !== 'none' && (
          <View style={styles.panelOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowPanel('none')} />
            <View style={[styles.panel, { paddingBottom: insets.bottom + 24, backgroundColor: theme.drawer }]}>
              <View style={styles.panelHeader}>
                <Text style={[styles.panelTitle, { color: theme.text }]}>
                  {showPanel === 'color' ? 'Couleur' : showPanel === 'labels' ? 'Libellés' : showPanel === 'formatting' ? 'Formatage' : 'Options'}
                </Text>
                <TouchableOpacity onPress={() => setShowPanel('none')}>
                  <ChevronDown size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {showPanel === 'color' && (
                <View style={styles.colorGrid}>
                  {NOTE_COLORS[colorScheme].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c, borderColor: theme.border }]}
                      onPress={() => { setNoteColor(c); setShowPanel('none'); }}
                    >
                      {noteColor === c && <Check size={20} color={c === '#ffffff' ? '#000' : '#FFF'} />}
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
                      placeholderTextColor={theme.subtext}
                      style={[styles.panelInput, { color: theme.text, backgroundColor: theme.inputBackground }]}
                      onSubmitEditing={handleAddNewLabel}
                    />
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.tint }]} onPress={handleAddNewLabel}>
                      <Plus size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.labelList}>
                    {allUserLabels.map(l => (
                      <TouchableOpacity
                        key={l}
                        style={[styles.labelChoice, labels.includes(l) && { backgroundColor: theme.tint + '20', borderColor: theme.tint }]}
                        onPress={() => toggleLabel(l)}
                      >
                        <Text style={[styles.labelChoiceText, { color: theme.text }, labels.includes(l) && { color: theme.tint, fontWeight: '700' }]}>{l}</Text>
                        {labels.includes(l) && <Check size={14} color={theme.tint} />}
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
                    selectedIconTint={theme.tint}
                    iconTint={theme.text}
                    style={[styles.richBar, { backgroundColor: 'transparent' }]}
                  />
                </View>
              )}

              {showPanel === 'more' && (
                <View style={{ gap: 4 }}>
                  <PanelItem label="Libellés" theme={theme} onPress={() => setShowPanel('labels')} icon={<Tag size={20} color={theme.icon} />} />
                  <PanelItem label="Partager la note" theme={theme} onPress={() => Share.share({ message: `${title}\n\n${content.replace(/<[^>]*>?/gm, '')}` })} icon={<Type size={20} color={theme.icon} />} />
                  <PanelItem label={isArchived ? "Désarchiver" : "Archiver"} theme={theme} onPress={() => { setIsArchived(!isArchived); setShowPanel('none'); }} icon={<Archive size={20} color={theme.icon} />} />
                  <PanelItem label="Supprimer" theme={theme} onPress={deleteNote} icon={<Trash2 size={20} color="#FF453A" />} />
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

function PanelItem({ label, onPress, icon, theme }: { label: string, onPress: () => void, icon?: any, theme: any }) {
  return (
    <TouchableOpacity style={styles.panelItem} onPress={onPress}>
      <View style={{ width: 36 }}>{icon}</View>
      <Text style={[styles.panelItemText, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 60 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titleInput: { fontSize: 24, fontWeight: '500', letterSpacing: -0.2, marginBottom: 8, marginTop: 10, paddingVertical: 10, textAlignVertical: 'top' },
  richEditor: { flex: 1, minHeight: 400 },
  richBar: { borderTopWidth: 0, borderBottomWidth: 0, width: '100%' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderTopWidth: 0.5 },
  barBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  lastEdit: { fontSize: 12 },
  labelScroll: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  formattingContainer: { paddingBottom: 10 },
  labelChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  labelChipText: { fontSize: 12, fontWeight: '500' },
  panelOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  panel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  panelTitle: { fontSize: 18, fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorDot: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', gap: 12 },
  panelInput: { flex: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  addBtn: { borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  labelList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  labelChoiceText: { fontSize: 14, fontWeight: '500' },
  panelItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  panelItemText: { fontSize: 16, fontWeight: '400' },
});
