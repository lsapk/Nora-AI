import React from 'react';
import { StyleSheet, View, TouchableOpacity, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Sparkles, Image as ImageIcon, List, RotateCcw, Save } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface FloatingDockProps {
  onAIPress: () => void;
  onUndoPress: () => void;
  onImagePress: () => void;
  onListPress: () => void;
  onSavePress: () => void;
}

export default function FloatingDock({ onAIPress, onUndoPress, onImagePress, onListPress, onSavePress }: FloatingDockProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const handlePress = (callback: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    callback();
  };

  const iconColor = isDark ? '#F2F2F7' : '#1C1C1E';

  return (
    <View style={styles.container}>
      <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={styles.dock}>
        <TouchableOpacity style={styles.iconButton} onPress={() => handlePress(onUndoPress)}>
          <RotateCcw size={20} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => handlePress(onImagePress)}>
          <ImageIcon size={20} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.iconButton, styles.aiButton]} onPress={() => handlePress(onAIPress)}>
          <Sparkles size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => handlePress(onListPress)}>
          <List size={20} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => handlePress(onSavePress)}>
          <Save size={20} color={iconColor} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 58,
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButton: {
    backgroundColor: '#007AFF',
  },
});
