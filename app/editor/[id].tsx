import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Image,
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
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Palette, PlusSquare, Type, Undo2, MoreVertical, Check, Trash2, Pin, Sparkles } from 'lucide-react-native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import AIChatOverlay from '../../components/AIChatOverlay';
import { getAIResponse } from '../../lib/ai';
import { searchUnsplashImages } from '../../lib/unsplash';

type Note = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  images_urls: string[] | null;
  note_color?: string | null;
  labels?: string[] | null;
  pinned?: boolean | null;
};

const NOTE_COLORS = ['#0B1020', '#1F2937', '#7E102B', '#2C6B5A', '#7A4B00', '#274E68', '#5A2D70', '#FFFFFF'];

export default function EditorScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const noteId = useMemo(() => (Array.isArray(params.id) ? params.id[0] : params.id), [params.id]);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [contentSelection, setContentSelection] = useState({ start: 0, end: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [noteColor, setNoteColor] = useState(isDark ? '#0B1020' : '#FFFFFF');
  const [labels, setLabels] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);

  const [showPanel, setShowPanel] = useState<'none' | 'add' | 'color' | 'text' | 'more'>('none');
  const [isAIChatVisible, setIsAIChatVisible] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);

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
    setContent(n.content || '');
    setNoteColor(n.note_color || (isDark ? '#0B1020' : '#FFFFFF'));
    setLabels(n.labels || []);
    setIsPinned(Boolean(n.pinned));
    setLoading(false);
  }, [noteId, user?.id, isDark]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const saveNote = useCallback(async (nextTitle: string, nextContent: string, nextColor = noteColor, nextLabels = labels, nextPinned = isPinned) => {
    if (!noteId || !user?.id) return;
    setIsSaving(true);

    const payload = {
      title: nextTitle,
      content: nextContent,
      note_color: nextColor,
      labels: nextLabels,
      pinned: nextPinned,
      updated_at: new Date().toISOString(),
    } as any;

    let { error } = await supabase.from('notes').update(payload).eq('id', noteId).eq('user_id', user.id);
    if (error && /column .* does not exist/i.test(error.message || '')) {
      ({ error } = await supabase
        .from('notes')
        .update({ title: nextTitle, content: nextContent, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', user.id));
    }

    setIsSaving(false);
    if (error) Alert.alert('Sauvegarde', error.message);
  }, [noteId, user?.id, noteColor, labels, isPinned]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => saveNote(title, content), 500);
    return () => clearTimeout(t);
  }, [title, content, noteColor, labels, isPinned, note, saveNote]);

  const textIsDark = noteColor === '#FFFFFF';
  const textColor = textIsDark ? '#111827' : '#F9FAFB';
  const subtleTextColor = textIsDark ? '#6B7280' : '#B9C2D0';

  const updateContentWithSelection = (nextText: string, nextSelection?: { start: number; end: number }) => {
    setContent(nextText);
    if (nextSelection) {
      setTimeout(() => setContentSelection(nextSelection), 0);
    }
  };

  const applyWrap = (prefix: string, suffix = prefix) => {
    const start = contentSelection.start;
    const end = contentSelection.end;
    const selected = content.slice(start, end);

    if (start !== end) {
      const next = `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`;
      updateContentWithSelection(next, { start: start + prefix.length, end: end + prefix.length });
    } else {
      const next = `${content.slice(0, start)}${prefix}${suffix}${content.slice(end)}`;
      const cursor = start + prefix.length;
      updateContentWithSelection(next, { start: cursor, end: cursor });
    }
  };

  const applyLinePrefix = (prefix: string) => {
    const start = contentSelection.start;
    const end = contentSelection.end;

    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const lineEndIndex = content.indexOf('\n', end);
    const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
    const chunk = content.slice(lineStart, lineEnd);
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixed = chunk
      .split('\n')
      .map((line) => `${prefix}${line.replace(new RegExp(`^${escapedPrefix}`), '')}`)
      .join('\n');

    const next = `${content.slice(0, lineStart)}${prefixed}${content.slice(lineEnd)}`;
    updateContentWithSelection(next, { start, end: start + prefixed.length });
  };

  const addChecklist = () => applyLinePrefix('- [ ] ');
  const addH1 = () => applyLinePrefix('# ');
  const addH2 = () => applyLinePrefix('## ');
  const addBold = () => applyWrap('**');
  const addItalic = () => applyWrap('*');
  const addUnderline = () => applyWrap('<u>', '</u>');

  const addImage = async () => {
    const imgs = await searchUnsplashImages('minimal wallpaper texture');
    if (!imgs.length) return Alert.alert('Image', 'Aucune image trouvée.');
    setContent((p) => `${p}${p ? '\n\n' : ''}![Image](${imgs[0]})`);
    setShowPanel('none');
  };

  const deleteNote = async () => {
    if (!noteId || !user?.id) return;
    const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', user.id);
    if (error) return Alert.alert('Erreur', error.message);
    router.back();
  };

  if (loading) return <View style={[styles.center, { flex: 1 }]}><Text>Chargement...</Text></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: noteColor }]} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.editorTop, { paddingTop: insets.top + 6 }]}> 
          <TouchableOpacity style={styles.glassBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={textColor} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.glassBtn} onPress={() => setIsAIChatVisible(true)}>
              <Sparkles size={18} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.glassBtn} onPress={() => setIsPinned((p) => !p)}>
              <Pin size={18} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom + 120, keyboardHeight + 90) }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre"
            placeholderTextColor={subtleTextColor}
            style={[styles.title, { color: textColor }]}
          />

          {!!labels.length && <Text style={[styles.labels, { color: textColor }]}>#{labels.join(' #')}</Text>}

          {!!note?.images_urls?.length && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {note.images_urls.map((url, i) => <Image key={`${url}-${i}`} source={{ uri: url }} style={styles.noteImage} />)}
            </ScrollView>
          )}

          <BlurView intensity={textIsDark ? 20 : 12} tint={textIsDark ? 'light' : 'dark'} style={styles.editorSurface}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Commencez à écrire..."
              placeholderTextColor={subtleTextColor}
              style={[styles.content, { color: textColor }]}
              multiline
              textAlignVertical="top"
              selection={contentSelection}
              onSelectionChange={(event) => setContentSelection(event.nativeEvent.selection)}
            />
          </BlurView>
        </ScrollView>

        <View style={[styles.bottomWrap, { bottom: Math.max(insets.bottom + 8, keyboardHeight + 8) }]}> 
          <BlurView intensity={40} tint={textIsDark ? 'light' : 'dark'} style={styles.bottomBar}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPanel('add')}><PlusSquare size={19} color={textColor} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPanel('color')}><Palette size={19} color={textColor} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPanel('text')}><Type size={19} color={textColor} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setContent(note?.content || '')}><Undo2 size={19} color={textColor} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPanel('more')}><MoreVertical size={19} color={textColor} /></TouchableOpacity>
            </View>
          </BlurView>
        </View>

        {showPanel !== 'none' && (
          <View style={styles.panelOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowPanel('none')} />
            <BlurView intensity={42} tint="dark" style={[styles.panel, { paddingBottom: insets.bottom + 18 }]}> 
              {showPanel === 'add' && (
                <>
                  <PanelItem label="Ajouter une image" onPress={addImage} />
                  <PanelItem label="Cases à cocher" onPress={() => { addChecklist(); setShowPanel('none'); }} />
                  <PanelItem label="Assistant IA" onPress={() => { setShowPanel('none'); setIsAIChatVisible(true); }} />
                </>
              )}
              {showPanel === 'color' && (
                <View style={styles.colorRow}>
                  {NOTE_COLORS.map((c) => (
                    <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }]} onPress={() => { setNoteColor(c); setShowPanel('none'); }}>
                      {noteColor === c && <Check size={16} color={c === '#FFFFFF' ? '#111827' : '#FFFFFF'} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {showPanel === 'text' && (
                <View style={styles.textRow}>
                  <PanelMini label="H1" onPress={addH1} />
                  <PanelMini label="H2" onPress={addH2} />
                  <PanelMini label="Aa" onPress={addChecklist} />
                  <PanelMini label="B" onPress={addBold} />
                  <PanelMini label="I" onPress={addItalic} />
                  <PanelMini label="U" onPress={addUnderline} />
                </View>
              )}
              {showPanel === 'more' && (
                <>
                  <PanelItem label={isSaving ? 'Sauvegarde…' : 'Enregistré'} onPress={() => saveNote(title, content)} />
                  <PanelItem label="Envoyer" onPress={async () => Share.share({ message: `${title}\n\n${content}` })} />
                  <PanelItem label="Libellés" onPress={() => setLabels((p) => [...p, `Label ${p.length + 1}`])} />
                  <PanelItem label="Supprimer" onPress={deleteNote} icon={<Trash2 size={18} color="#F9FAFB" />} />
                </>
              )}
            </BlurView>
          </View>
        )}
      </KeyboardAvoidingView>

      <AIChatOverlay
        isVisible={isAIChatVisible}
        onClose={() => setIsAIChatVisible(false)}
        isTyping={isAITyping}
        messages={aiMessages}
        onSendMessage={async (msg) => {
          setAiMessages((p) => [...p, { role: 'user', content: msg }]);
          setIsAITyping(true);
          try {
            const res = await getAIResponse(content, msg);
            if (!res) {
              setAiMessages((p) => [...p, { role: 'ai', content: "L'IA n'est pas disponible: vérifie EXPO_PUBLIC_GEMINI_API_KEY/EXPO_PUBLIC_GOOGLE_API_KEY et la connexion internet." }]);
              return;
            }
            setAiMessages((p) => [...p, { role: 'ai', content: res.explanation }]);
            setContent(res.newContent || content);
          } catch (e: any) {
            setAiMessages((p) => [...p, { role: 'ai', content: `Erreur IA: ${e?.message || 'service indisponible'}` }]);
          } finally {
            setIsAITyping(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

function PanelItem({ label, onPress, icon }: { label: string; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <TouchableOpacity style={styles.panelItem} onPress={onPress}>
      <View style={{ width: 24 }}>{icon}</View>
      <Text style={styles.panelText}>{label}</Text>
    </TouchableOpacity>
  );
}

function PanelMini({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.miniBtn} onPress={onPress}>
      <Text style={{ color: '#F9FAFB', fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  editorTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 8 },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: { fontSize: 32, fontWeight: '600', marginBottom: 10, letterSpacing: -0.2 },
  labels: { fontSize: 12, marginBottom: 8, opacity: 0.9 },
  noteImage: { width: 150, height: 95, borderRadius: 12, marginRight: 8 },
  editorSurface: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  content: { minHeight: 420, fontSize: 16.5, lineHeight: 24 },
  bottomWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 12 },
  bottomBar: {
    height: 58,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconBtn: { width: 39, height: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  panelOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  panel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12, overflow: 'hidden' },
  panelItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  panelText: { color: '#F9FAFB', fontSize: 17 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 6 },
  colorDot: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  textRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 8 },
  miniBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
});
