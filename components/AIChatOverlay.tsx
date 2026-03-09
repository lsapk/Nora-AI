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
  useColorScheme,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Sparkles, Send, X, FileText, CheckCircle, Briefcase, List } from 'lucide-react-native';
import Colors from '@/constants/Colors';

interface AIChatOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  messages: { role: 'user' | 'ai'; content: string }[];
  isTyping: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Résumer', icon: FileText, text: 'Résume cette note' },
  { label: 'Corriger', icon: CheckCircle, text: 'Corrige les fautes' },
  { label: 'Pro', icon: Briefcase, text: 'Version professionnelle' },
  { label: 'Liste', icon: List, text: 'To-do list claire' },
];

export default function AIChatOverlay({ isVisible, onClose, onSendMessage, messages, isTyping }: AIChatOverlayProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const translateY = useSharedValue(900);
  const backdropOpacity = useSharedValue(0);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  useEffect(() => {
    if (isVisible) {
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.back(0.5)) });
      backdropOpacity.value = withTiming(1, { duration: 200 });
      return;
    }
    translateY.value = withTiming(900, { duration: 200, easing: Easing.in(Easing.cubic) });
    backdropOpacity.value = withTiming(0, { duration: 150 });
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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

  if (!isVisible && translateY.value === 900) return null;

  return (
    <View style={styles.root} pointerEvents={isVisible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheetWrap, animatedStyle]}>
        <View style={[styles.sheet, { backgroundColor: theme.drawer }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.sparkleBg, { backgroundColor: theme.tint + '15' }]}>
                <Sparkles size={18} color={theme.tint} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Nora AI</Text>
                <Text style={[styles.subtitle, { color: theme.subtext }]}>Assistant de rédaction</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.border + '50' }]}>
              <X size={18} color={theme.icon} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt.label}
                onPress={() => handleSend(prompt.text)}
                style={[styles.quickChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
              >
                <prompt.icon size={14} color={theme.tint} />
                <Text style={[styles.quickChipText, { color: theme.text }]}>{prompt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && !isTyping && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.subtext }]}>Comment puis-je vous aider aujourd'hui ?</Text>
              </View>
            )}
            {messages.map((msg, index) => (
              <View key={`${msg.role}-${index}`} style={[
                styles.messageBubble,
                msg.role === 'user' ? [styles.userBubble, { backgroundColor: theme.tint }] : [styles.aiBubble, { backgroundColor: theme.inputBackground }]
              ]}>
                <Text style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : { color: theme.text }
                ]}>{msg.content}</Text>
              </View>
            ))}
            {isTyping && (
              <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.aiText, { color: theme.text, opacity: 0.6 }]}>Nora AI réfléchit…</Text>
              </View>
            )}
          </ScrollView>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
            <View style={[styles.inputArea, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Demande à Nora..."
                placeholderTextColor={theme.subtext}
                value={input}
                onChangeText={setInput}
                multiline
                maxHeight={100}
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                style={[styles.sendButton, { backgroundColor: theme.tint }]}
                disabled={!input.trim()}
              >
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { height: '70%' },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sparkleBg: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', fontSize: 18 },
  subtitle: { fontSize: 12, marginTop: 1 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  quickChipText: { fontSize: 13, fontWeight: '500' },
  messagesContainer: { paddingBottom: 20, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 15, fontWeight: '400', textAlign: 'center' },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, marginBottom: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#FFFFFF' },
  aiText: { fontStyle: 'italic' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, paddingTop: 4, paddingBottom: 4 },
  sendButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});
