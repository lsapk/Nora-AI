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
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Palette,
  PlusSquare,
  Undo2,
  Redo2,
  MoreVertical,
  Camera,
  ImagePlus,
  Pencil,
  Mic,
  ListChecks,
  Type,
  Bold,
  Italic,
  Underline,
  Send,
  Trash2,
  Tag,
  Check,
  Pin,
  Copy,
  Heading1,
  Heading2,
} from 'lucide-react-native';

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

const NOTE_COLORS = ['#0D111B', '#7E102B', '#2C6B5A', '#7A4B00', '#274E68', '#5A2D70'];

export default function EditorScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const noteId = useMemo(() => (Array.isArray(params.id) ? params.id[0] : params.id), [params.id]);
  const { user } = useAuth();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [noteColor, setNoteColor] = useState(isDark ? '#0D111B' : '#FFFFFF');
  const [labels, setLabels] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);

  const [isAIChatVisible, setIsAIChatVisible] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<string | null>(null);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showMorePanel, setShowMorePanel] = useState(false);

  const closePanels = () => {
    setShowAddPanel(false);
    setShowColorPanel(false);
    setShowTextPanel(false);
    setShowMorePanel(false);
  };

  const fetchNote = useCallback(async () => {
    if (!noteId || !user?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      Alert.alert('Erreur', error.message);
      setLoading(false);
      return;
    }

    const loaded = data as Note;
    setNote(loaded);
    setTitle(loaded.title || '');
    setContent(loaded.content || '');
    setNoteColor(loaded.note_color || (isDark ? '#0D111B' : '#FFFFFF'));
    setLabels(loaded.labels || []);
    setIsPinned(Boolean(loaded.pinned));
    setLoading(false);
  }, [noteId, user?.id, isDark]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const saveSnapshot = useCallback(async () => {
    if (!noteId || !note) return;
    await supabase.from('note_versions').insert({ note_id: noteId, content, images_urls: note.images_urls || [] });
  }, [noteId, note, content]);

  const saveNote = useCallback(
    async (nextTitle: string, nextContent: string, nextColor = noteColor, nextLabels = labels, nextPinned = isPinned) => {
      if (!noteId || !user?.id) return false;
      setIsSaving(true);

      const payload = {
        title: nextTitle,
        content: nextContent,
        updated_at: new Date().toISOString(),
        note_color: nextColor,
        labels: nextLabels,
        pinned: nextPinned,
      } as any;

      let error = null as any;

      const res = await supabase.from('notes').update(payload).eq('id', noteId).eq('user_id', user.id);
      error = res.error;

      if (error && /column .* does not exist/i.test(error.message || '')) {
        const fallback = await supabase
          .from('notes')
          .update({ title: nextTitle, content: nextContent, updated_at: new Date().toISOString() })
          .eq('id', noteId)
          .eq('user_id', user.id);
        error = fallback.error;
      }

      setIsSaving(false);

      if (error) {
        Alert.alert('Erreur de sauvegarde', error.message);
        return false;
      }

      setNote((prev) =>
        prev
          ? { ...prev, title: nextTitle, content: nextContent, note_color: nextColor, labels: nextLabels, pinned: nextPinned }
          : prev
      );
      return true;
    },
    [noteId, user?.id, noteColor, labels, isPinned]
  );

  useEffect(() => {
    if (!note) return;
    const changed =
      content !== (note.content || '') ||
      title !== (note.title || '') ||
      noteColor !== (note.note_color || (isDark ? '#0D111B' : '#FFFFFF')) ||
      JSON.stringify(labels) !== JSON.stringify(note.labels || []) ||
      isPinned !== Boolean(note.pinned);

    if (!changed) return;

    const timer = setTimeout(() => {
      saveNote(title, content);
    }, 800);

    return () => clearTimeout(timer);
  }, [title, content, noteColor, labels, isPinned, note, isDark, saveNote]);

  const handleUndo = async () => {
    if (!noteId) return;
    const { data } = await supabase
      .from('note_versions')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      Alert.alert('Information', 'Aucun historique disponible.');
      return;
    }

    setContent(data.content || '');
    await supabase.from('note_versions').delete().eq('id', data.id);
  };

  const applyInline = async (prefix: string, suffix = '') => {
    await saveSnapshot();
    setContent((prev) => `${prev}${prev.endsWith('\n') || prev.length === 0 ? '' : '\n'}${prefix}${suffix}`);
  };

  const handleInsertImage = async () => {
    await saveSnapshot();
    const images = await searchUnsplashImages('minimal note');
    if (!images.length) {
      Alert.alert('Image', "Aucune image disponible (vérifie la clé Unsplash).")
      return;
    }
    setContent((prev) => `${prev}\n\n![Image](${images[0]})`);
    closePanels();
  };

  const handleChecklist = async () => {
    await saveSnapshot();
    const lines = (content || '').split('\n');
    const transformed = lines.map((line) => (line.trim().length ? `- [ ] ${line.replace(/^- \[.\] /, '')}` : line));
    setContent(transformed.join('\n'));
    closePanels();
  };

  const handleAddLabel = async () => {
    const next = `Label ${labels.length + 1}`;
    const nextLabels = [...labels, next];
    setLabels(nextLabels);
    await saveNote(title, content, noteColor, nextLabels, isPinned);
  };

  const handleDelete = async () => {
    if (!noteId || !user?.id) return;
    const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', user.id);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    router.back();
  };

  const handleShare = async () => {
    await Share.share({ message: `${title || 'Note'}\n\n${content}` });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Chargement...</Text>
      </View>
    );
  }

  const lightText = noteColor === '#FFFFFF' || noteColor === '#F2F2F7';
  const textColor = lightText ? '#1C1C1E' : '#F5F5F7';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: noteColor }]}> 
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={textColor} />
        </TouchableOpacity>

        <View style={styles.topRightRow}>
          <TouchableOpacity style={styles.topButton} onPress={() => setIsPinned((p) => !p)}>
            <Pin size={18} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topButton} onPress={() => Alert.alert('Rappel', 'Fonction rappel à connecter avec notifications.')}>
            <Bell size={18} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topButton} onPress={() => Alert.alert('Archiver', 'Fonction archive prête côté UI.') }>
            <Bookmark size={18} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TextInput
          style={[styles.titleInput, { color: textColor }]}
          placeholder="Titre"
          placeholderTextColor={lightText ? '#636366' : '#B3B3BA'}
          value={title}
          onChangeText={setTitle}
        />

        {!!labels.length && (
          <View style={styles.labelsRow}>
            {labels.map((label) => (
              <View key={label} style={styles.labelChip}>
                <Tag size={12} color={textColor} />
                <Text style={[styles.labelText, { color: textColor }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {!!note?.images_urls?.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {note.images_urls.map((url, index) => (
              <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.noteImage} />
            ))}
          </ScrollView>
        )}

        <TextInput
          style={[styles.contentInput, { color: textColor }]}
          placeholder="Commencez à écrire..."
          placeholderTextColor={lightText ? '#636366' : '#B3B3BA'}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={styles.bottomBarWrap}>
        <BlurView intensity={50} tint={lightText ? 'light' : 'dark'} style={styles.bottomBar}>
          <View style={styles.bottomLeft}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { closePanels(); setShowAddPanel(true); }}>
              <PlusSquare size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { closePanels(); setShowColorPanel(true); }}>
              <Palette size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { closePanels(); setShowTextPanel(true); }}>
              <Type size={20} color={textColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleUndo}>
              <Undo2 size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.disabledBtn]} onPress={() => {}}>
              <Redo2 size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { closePanels(); setShowMorePanel(true); }}>
              <MoreVertical size={20} color={textColor} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {showAddPanel && (
        <BottomPanel title="Ajouter" onClose={closePanels}>
          <ActionItem icon={<Camera size={20} color="#F5F5F7" />} label="Prendre une photo" onPress={() => Alert.alert('Photo', 'Fonction caméra à brancher avec expo-image-picker.')} />
          <ActionItem icon={<ImagePlus size={20} color="#F5F5F7" />} label="Ajouter une image" onPress={handleInsertImage} />
          <ActionItem icon={<Pencil size={20} color="#F5F5F7" />} label="Dessin" onPress={() => Alert.alert('Dessin', 'Canvas de dessin à intégrer (module dédié).')} />
          <ActionItem icon={<Mic size={20} color="#F5F5F7" />} label="Enregistrement" onPress={() => Alert.alert('Enregistrement', 'Dictée vocale à connecter avec expo-av / speech.') } />
          <ActionItem icon={<ListChecks size={20} color="#F5F5F7" />} label="Cases à cocher" onPress={handleChecklist} />
        </BottomPanel>
      )}

      {showColorPanel && (
        <BottomPanel title="Couleur" onClose={closePanels}>
          <View style={styles.colorsRow}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }]} onPress={async () => {
                setNoteColor(c);
                await saveNote(title, content, c, labels, isPinned);
              }}>
                {noteColor === c && <Check size={16} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </BottomPanel>
      )}

      {showTextPanel && (
        <BottomPanel title="Format" onClose={closePanels}>
          <View style={styles.formatRow}>
            <TouchableOpacity style={styles.formatBtn} onPress={() => applyInline('# ', '')}><Heading1 size={18} color="#F5F5F7" /></TouchableOpacity>
            <TouchableOpacity style={styles.formatBtn} onPress={() => applyInline('## ', '')}><Heading2 size={18} color="#F5F5F7" /></TouchableOpacity>
            <TouchableOpacity style={styles.formatBtn} onPress={() => applyInline('**', '**')}><Bold size={18} color="#F5F5F7" /></TouchableOpacity>
            <TouchableOpacity style={styles.formatBtn} onPress={() => applyInline('*', '*')}><Italic size={18} color="#F5F5F7" /></TouchableOpacity>
            <TouchableOpacity style={styles.formatBtn} onPress={() => applyInline('<u>', '</u>')}><Underline size={18} color="#F5F5F7" /></TouchableOpacity>
          </View>
        </BottomPanel>
      )}

      {showMorePanel && (
        <BottomPanel title={isSaving ? 'Sauvegarde...' : 'Modifié à l\'instant'} onClose={closePanels}>
          <ActionItem icon={<Trash2 size={20} color="#F5F5F7" />} label="Supprimer" onPress={handleDelete} />
          <ActionItem icon={<Copy size={20} color="#F5F5F7" />} label="Créer une copie" onPress={async () => {
            if (!user?.id) return;
            const { data } = await supabase.from('notes').insert({
              user_id: user.id,
              title: `${title} (copie)`,
              content,
              note_color: noteColor,
              labels,
            } as any).select().single();
            if (data?.id) router.push(`/editor/${data.id}`);
          }} />
          <ActionItem icon={<Send size={20} color="#F5F5F7" />} label="Envoyer" onPress={handleShare} />
          <ActionItem icon={<Tag size={20} color="#F5F5F7" />} label="Libellés" onPress={handleAddLabel} />
          <ActionItem icon={<SparkButton />} label="Assistant IA" onPress={() => { closePanels(); setIsAIChatVisible(true); }} />
        </BottomPanel>
      )}

      <AIChatOverlay
        isVisible={isAIChatVisible}
        onClose={() => setIsAIChatVisible(false)}
        isTyping={isAITyping}
        messages={aiMessages}
        onSendMessage={async (msg) => {
          setAiMessages((prev) => [...prev, { role: 'user', content: msg }]);
          setIsAITyping(true);
          try {
            const response = await getAIResponse(content, msg);
            if (!response) {
              setAiMessages((prev) => [...prev, { role: 'ai', content: 'Configure EXPO_PUBLIC_GEMINI_API_KEY pour utiliser l\'IA.' }]);
              return;
            }
            setAiMessages((prev) => [...prev, { role: 'ai', content: response.explanation }]);
            setPendingProposal(response.newContent);
          } catch {
            setAiMessages((prev) => [...prev, { role: 'ai', content: 'Erreur IA.' }]);
          } finally {
            setIsAITyping(false);
          }
        }}
      />

      {pendingProposal && (
        <View style={styles.proposalOverlay}>
          <BlurView intensity={75} tint="light" style={styles.proposalCard}>
            <Text style={styles.proposalTitle}>Proposition IA</Text>
            <ScrollView style={styles.proposalPreview}><Text style={styles.proposalText}>{pendingProposal}</Text></ScrollView>
            <View style={styles.proposalButtons}>
              <TouchableOpacity style={[styles.propButton, styles.cancelButton]} onPress={() => setPendingProposal(null)}><Text style={styles.cancelButtonText}>Ignorer</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.propButton, styles.applyButton]} onPress={async () => { await saveSnapshot(); setContent(pendingProposal); setPendingProposal(null); }}><Text style={styles.applyButtonText}>Appliquer</Text></TouchableOpacity>
            </View>
          </BlurView>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function SparkButton() {
  return <Text style={{ color: '#F5F5F7', fontSize: 20 }}>✦</Text>;
}

function BottomPanel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <View style={styles.panelOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <BlurView intensity={45} tint="dark" style={styles.panelCard}>
        <Text style={styles.panelTitle}>{title}</Text>
        {children}
      </BlurView>
    </View>
  );
}

function ActionItem({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  topBar: {
    paddingTop: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRightRow: { flexDirection: 'row', gap: 10 },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 140, paddingTop: 26 },
  titleInput: { fontSize: 40, fontWeight: '500', marginBottom: 12 },
  contentInput: { minHeight: 360, fontSize: 34 / 2, lineHeight: 24 },
  labelsRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  labelText: { fontSize: 12, fontWeight: '600' },
  imageScroll: { marginBottom: 12 },
  noteImage: { width: 142, height: 90, borderRadius: 10, marginRight: 8 },
  bottomBarWrap: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
  },
  bottomBar: {
    height: 58,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  bottomLeft: { flexDirection: 'row', alignItems: 'center' },
  bottomRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { opacity: 0.35 },
  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  panelCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 26,
    backgroundColor: 'rgba(70,18,31,0.92)',
    overflow: 'hidden',
  },
  panelTitle: { color: '#F5F5F7', fontSize: 32 / 2, fontWeight: '700', marginBottom: 12 },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  actionIcon: { width: 36, alignItems: 'center' },
  actionLabel: { color: '#F5F5F7', fontSize: 32 / 2, marginLeft: 8 },
  colorsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  formatRow: { flexDirection: 'row', gap: 10 },
  formatBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  proposalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  proposalCard: { width: '100%', maxHeight: '75%', borderRadius: 16, padding: 16, overflow: 'hidden' },
  proposalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  proposalPreview: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10, padding: 10, marginBottom: 12 },
  proposalText: { color: '#1C1C1E', lineHeight: 20 },
  proposalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  propButton: { flex: 0.48, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: '#E9E9EB' },
  applyButton: { backgroundColor: '#007AFF' },
  cancelButtonText: { color: '#1C1C1E', fontWeight: '600' },
  applyButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
