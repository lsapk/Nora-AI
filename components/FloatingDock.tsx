import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Sparkles, Image as ImageIcon, List, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface FloatingDockProps {
  onAIPress: () => void;
  onUndoPress: () => void;
  onImagePress: () => void;
  onListPress: () => void;
}

export default function FloatingDock({ onAIPress, onUndoPress, onImagePress, onListPress }: FloatingDockProps) {
  const handlePress = (callback: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    callback();
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={90} tint="light" style={styles.dock}>
        <TouchableOpacity style={styles.iconButton} onPress={() => handlePress(onUndoPress)}>
          <RotateCcw size={24} color="#3A3A3C" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => handlePress(onImagePress)}>
          <ImageIcon size={24} color="#3A3A3C" />
        </TouchableOpacity>

        <View style={styles.centerContainer}>
          <TouchableOpacity style={styles.aiButton} onPress={() => handlePress(onAIPress)}>
            <Sparkles size={32} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={() => handlePress(onListPress)}>
          <List size={24} color="#3A3A3C" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
          {/* Placeholder for more */}
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 70,
    width: '100%',
    maxWidth: 400,
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  iconButton: {
    padding: 10,
  },
  centerContainer: {
    marginTop: -40, // Make it prominent
  },
  aiButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});
