import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Image,
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
import { ArrowLeft, Palette, PlusSquare, Type, Undo2, MoreVertical, Check, Trash2, Send, Tag, Pin } from 'lucide-react-native';

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

const NOTE_COLORS = ['#0F172A', '#7E102B', '#2C6B5A', '#7A4B00', '#274E68', '#5A2D70', '#FFFFFF'];

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

  const [noteColor, setNoteColor] = useState(isDark ? '#0F172A' : '#FFFFFF');
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
    setNoteColor(n.note_color || (isDark ? '#0F172A' : '#FFFFFF'));
    setLabels(n.labels || []);
    setIsPinned(Boolean(n.pinned));
    setLoading(false);
  }, [noteId, user?.id, isDark]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

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
    const t = setTimeout(() => saveNote(title, content), 700);
    return () => clearTimeout(t);
  }, [title, content, noteColor, labels, isPinned]);

  const textIsDark = noteColor === '#FFFFFF';
  const textColor = textIsDark ? '#1F2937' : '#F9FAFB';

  const addChecklist = () => setContent((p) => `${p}${p ? '\n' : ''}- [ ] `);
  const addH1 = () => setContent((p) => `${p}${p ? '\n' : ''}# `);
  const addH2 = () => setContent((p) => `${p}${p ? '\n' : ''}## `);
  const addBold = () => setContent((p) => `${p}**texte**`);
  const addItalic = () => setContent((p) => `${p}*texte*`);
  const addUnderline = () => setContent((p) => `${p}<u>texte</u>`);

  const addImage = async () => {
    const imgs = await searchUnsplashImages('minimal background');
    if (!imgs.length) return Alert.alert('Image', 'Aucune image trouvée.');
    setContent((p) => `${p}\n\n![Image](${imgs[0]})`);
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
          <TouchableOpacity style={styles.roundBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={textColor} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.roundBtn} onPress={() => setIsPinned((p) => !p)}><Pin size={18} color={textColor} /></TouchableOpacity>
            <TouchableOpacity style={styles.roundBtn} onPress={() => setShowPanel('color')}><Palette size={18} color={textColor} /></TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre"
            placeholderTextColor={textIsDark ? '#6B7280' : '#C6CEDB'}
            style={[styles.title, { color: textColor }]}
          />
          {!!labels.length && <Text style={[styles.labels, { color: textColor }]}>#{labels.join(' #')}</Text>}
          {!!note?.images_urls?.length && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {note.images_urls.map((url, i) => <Image key={`${url}-${i}`} source={{ uri: url }} style={styles.noteImage} />)}
            </ScrollView>
          )}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Commencez à écrire..."
            placeholderTextColor={textIsDark ? '#6B7280' : '#C6CEDB'}
            style={[styles.content, { color: textColor }]}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={[styles.bottomWrap, { paddingBottom: insets.bottom + 8 }]}> 
          <BlurView intensity={45} tint={textIsDark ? 'light' : 'dark'} style={styles.bottomBar}>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPanel('add')}><PlusSquare size={20} color={textColor} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPanel('color')}><Palette size={20} color={textColor} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPanel('text')}><Type size={20} color={textColor} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setContent(note?.content || '')}><Undo2 size={20} color={textColor} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPanel('more')}><MoreVertical size={20} color={textColor} /></TouchableOpacity>
            </View>
          </BlurView>
        </View>

        {showPanel !== 'none' && (
          <View style={styles.panelOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowPanel('none')} />
            <BlurView intensity={35} tint="dark" style={[styles.panel, { paddingBottom: insets.bottom + 18 }]}> 
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
              setAiMessages((p) => [...p, { role: 'ai', content: "L'IA n'est pas disponible: vérifie EXPO_PUBLIC_GEMINI_API_KEY et la connexion internet." }]);
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
  roundBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  title: { fontSize: 38 / 1.2, fontWeight: '500', marginBottom: 10 },
  labels: { fontSize: 12, marginBottom: 8, opacity: 0.9 },
  noteImage: { width: 140, height: 90, borderRadius: 10, marginRight: 8 },
  content: { minHeight: 380, fontSize: 17, lineHeight: 24 },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  bottomBar: { height: 58, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, overflow: 'hidden' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  panelOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  panel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12, overflow: 'hidden' },
  panelItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  panelText: { color: '#F9FAFB', fontSize: 17 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 6 },
  colorDot: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  textRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  miniBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
});
