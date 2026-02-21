import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TextInput, ScrollView, Text, TouchableOpacity, useColorScheme, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import Markdown from 'react-native-markdown-display';
import { ChevronLeft, Eye, Edit3, Save } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import FloatingDock from '../../components/FloatingDock';
import AIChatOverlay from '../../components/AIChatOverlay';
import { getAIResponse } from '../../lib/ai';
import { searchUnsplashImages } from '../../lib/unsplash';

export default function EditorScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [note, setNote] = useState<any>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(true);

  const [isAIChatVisible, setIsAIChatVisible] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<string | null>(null);

  const saveSnapshot = async () => {
    if (!note) return;
    await supabase.from('note_versions').insert({
      note_id: id,
      content: content,
      images_urls: note.images_urls || []
    });
  };

  const handleUndo = async () => {
    const { data, error } = await supabase
      .from('note_versions')
      .select('*')
      .eq('note_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setContent(data.content);
      // Delete the version after restoring it (optional, depends on depth)
      await supabase.from('note_versions').delete().eq('id', data.id);
    }
  };

  useEffect(() => {
    fetchNote();
  }, [id]);

  const fetchNote = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      setNote(data);
      setContent(data.content || '');
      setTitle(data.title || '');
    }
    setLoading(false);
  };

  const saveNote = async () => {
    const { error } = await supabase
      .from('notes')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error(error);
  };

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (note && (content !== note.content || title !== note.title)) {
        saveNote();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, title]);

  if (loading) return <View style={styles.container}><Text>Chargement...</Text></View>;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.modeButton}>
          {isEditing ? <Eye size={24} color="#007AFF" /> : <Edit3 size={24} color="#007AFF" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={[styles.titleInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
          placeholder="Titre"
          placeholderTextColor="#8E8E93"
          value={title}
          onChangeText={setTitle}
          multiline
        />

        {note?.images_urls?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {note.images_urls.map((url: string, index: number) => (
              <Image key={index} source={{ uri: url }} style={styles.noteImage} />
            ))}
          </ScrollView>
        )}

        {isEditing ? (
          <TextInput
            style={[styles.contentInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
            placeholder="Commencez à écrire..."
            placeholderTextColor="#8E8E93"
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
          />
        ) : (
          <View style={styles.markdownContainer}>
            <Markdown style={markdownStyles(isDark)}>
              {content || '_Aucun contenu_'}
            </Markdown>
          </View>
        )}
      </ScrollView>

      <FloatingDock
        onAIPress={() => setIsAIChatVisible(true)}
        onUndoPress={handleUndo}
        onImagePress={() => {/* Handle Images */}}
        onListPress={() => {/* Handle List formatting */}}
      />

      <AIChatOverlay
        isVisible={isAIChatVisible}
        onClose={() => setIsAIChatVisible(false)}
        onSendMessage={async (msg) => {
          setAiMessages(prev => [...prev, { role: 'user', content: msg }]);
          setIsAITyping(true);

          try {
            const response = await getAIResponse(content, msg);
            if (response) {
              setAiMessages(prev => [...prev, { role: 'ai', content: response.explanation }]);
              setPendingProposal(response.newContent);

              if (response.suggestedImages && response.suggestedImages.length > 0) {
                const images = await searchUnsplashImages(response.suggestedImages[0]);
                if (images.length > 0) {
                  // Automatically add the first one as a suggestion
                  setPendingProposal(prev => (prev || '') + `\n\n![Image](${images[0]})`);
                }
              }
            }
          } catch (error) {
            setAiMessages(prev => [...prev, { role: 'ai', content: "Désolé, j'ai rencontré une erreur." }]);
          } finally {
            setIsAITyping(false);
          }
        }}
        messages={aiMessages}
        isTyping={isAITyping}
      />

      {pendingProposal && (
        <BlurView intensity={90} style={styles.proposalOverlay}>
          <Text style={styles.proposalTitle}>Appliquer les modifications ?</Text>
          <ScrollView style={styles.proposalPreview}>
            <Markdown>{pendingProposal}</Markdown>
          </ScrollView>
          <View style={styles.proposalButtons}>
            <TouchableOpacity
              style={[styles.propButton, styles.cancelButton]}
              onPress={() => setPendingProposal(null)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.propButton, styles.applyButton]}
              onPress={async () => {
                // Save old state before applying
                await saveSnapshot();
                setContent(pendingProposal);
                setPendingProposal(null);
                setIsAIChatVisible(false);
              }}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  modeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  imageScroll: {
    marginBottom: 20,
  },
  noteImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 10,
  },
  contentInput: {
    fontSize: 17,
    lineHeight: 24,
    minHeight: 400,
    textAlignVertical: 'top',
  },
  markdownContainer: {
    minHeight: 400,
  },
  proposalOverlay: {
    position: 'absolute',
    top: 100,
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 20,
    padding: 20,
    zIndex: 2000,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  proposalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  proposalPreview: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
  },
  proposalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  propButton: {
    flex: 0.48,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E9E9EB',
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

const markdownStyles = (isDark: boolean) => ({
  body: {
    color: isDark ? '#FFFFFF' : '#000000',
    fontSize: 17,
    lineHeight: 24,
  },
  heading1: {
    color: isDark ? '#FFFFFF' : '#000000',
    marginVertical: 10,
  },
  // Add more styles as needed
});
