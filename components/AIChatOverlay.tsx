import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Sparkles, Send, X } from 'lucide-react-native';

interface AIChatOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  messages: { role: 'user' | 'ai'; content: string }[];
  isTyping: boolean;
}

const QUICK_PROMPTS = ['Résume cette note', 'Corrige les fautes', 'Version professionnelle', 'To-do list claire'];

export default function AIChatOverlay({ isVisible, onClose, onSendMessage, messages, isTyping }: AIChatOverlayProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const translateY = useSharedValue(900);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      backdropOpacity.value = withTiming(1, { duration: 180 });
      return;
    }
    translateY.value = withTiming(900, { duration: 160, easing: Easing.in(Easing.cubic) });
    backdropOpacity.value = withTiming(0, { duration: 100 });
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, isTyping, isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const animatedBackdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const handleSend = (text?: string) => {
    const payload = (text ?? input).trim();
    if (!payload) return;
    onSendMessage(payload);
    setInput('');
  };

  if (!isVisible) return null;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheetWrap, animatedStyle]}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.sparkleBg}>
                <Sparkles size={16} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.title}>Nora AI</Text>
                <Text style={styles.subtitle}>Assistant de rédaction</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity key={prompt} onPress={() => handleSend(prompt)} style={styles.quickChip}>
                <Text style={styles.quickChipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView ref={scrollRef} contentContainerStyle={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <View key={`${msg.role}-${index}`} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.aiText]}>{msg.content}</Text>
              </View>
            ))}
            {isTyping && (
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <Text style={styles.aiText}>Nora AI réfléchit…</Text>
              </View>
            )}
          </ScrollView>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <View style={styles.inputArea}>
              <TextInput
                style={styles.input}
                placeholder="Demande à Nora AI d'améliorer ta note..."
                placeholderTextColor="#71717A"
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity onPress={() => handleSend()} style={styles.sendButton}>
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 1000, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { height: '76%' },
  sheet: {
    flex: 1,
    backgroundColor: '#0B1220',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginTop: 8, marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sparkleBg: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5EEFF' },
  title: { color: '#FAFAFA', fontWeight: '700', fontSize: 16 },
  subtitle: { color: '#A1A1AA', fontSize: 12, marginTop: 1 },
  closeButton: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151F33' },
  quickRow: { gap: 8, paddingTop: 12, paddingBottom: 10 },
  quickChip: { borderRadius: 999, backgroundColor: '#16223A', paddingHorizontal: 12, paddingVertical: 8 },
  quickChipText: { color: '#E4E4E7', fontSize: 12.5 },
  messagesContainer: { paddingBottom: 12 },
  messageBubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, marginBottom: 8, maxWidth: '88%' },
  userBubble: { backgroundColor: '#2563EB', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#1A2439', alignSelf: 'flex-start' },
  messageText: { fontSize: 14, lineHeight: 19 },
  userText: { color: '#FFFFFF' },
  aiText: { color: '#F4F4F5' },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 16, backgroundColor: '#151F33', paddingHorizontal: 10, paddingVertical: 8, marginBottom: Platform.OS === 'ios' ? 12 : 6 },
  input: { flex: 1, color: '#FAFAFA', fontSize: 15, maxHeight: 110, paddingTop: 3 },
  sendButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
