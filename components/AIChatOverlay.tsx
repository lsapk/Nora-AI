import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { X, Send, Sparkles } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AIChatOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  messages: { role: 'user' | 'ai'; content: string }[];
  isTyping: boolean;
}

export default function AIChatOverlay({ isVisible, onClose, onSendMessage, messages, isTyping }: AIChatOverlayProps) {
  const [input, setInput] = useState('');
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
      backdropOpacity.value = withTiming(1, { duration: 180 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180, easing: Easing.in(Easing.cubic) });
      backdropOpacity.value = withTiming(0, { duration: 120 });
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  if (!isVisible) return null;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.container, animatedStyle]}>
        <BlurView intensity={70} tint="light" style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Sparkles size={18} color="#007AFF" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Assistant IA</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={22} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <View key={index} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.aiText]}>{msg.content}</Text>
              </View>
            ))}
            {isTyping && (
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <Text style={styles.aiText}>L'IA réfléchit...</Text>
              </View>
            )}
          </ScrollView>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
            <View style={styles.inputArea}>
              <TextInput
                style={styles.input}
                placeholder="Demande à l'IA d'améliorer ta note..."
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                <Send size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  container: {
    height: SCREEN_HEIGHT * 0.66,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 6,
  },
  messagesContainer: {
    paddingBottom: 16,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    maxWidth: '88%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#E9E9EB',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1C1C1E',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 90,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
