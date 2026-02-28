import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useColorScheme, ScrollView, Alert, Linking, Share } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { LogOut, User, Shield, FileText, Download, HelpCircle, ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const exportData = async () => {
    try {
      const { data, error } = await supabase.from('notes').select('*').eq('user_id', user?.id);
      if (error) throw error;
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        message: json,
        title: 'Export de mes données Nora AI',
      });
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#0C101A' : '#F2F2F7' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>Paramètres</Text>
      </View>

      <Text style={styles.sectionTitle}>COMPTE</Text>
      <View style={[styles.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        <View style={styles.row}>
          <User size={22} color="#AFC8FF" />
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>Email</Text>
            <Text style={styles.rowValue}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>LÉGAL</Text>
      <View style={[styles.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://example.com/cgu')}>
          <FileText size={22} color="#AFC8FF" />
          <Text style={[styles.rowLabel, { color: isDark ? '#FFFFFF' : '#000000', marginLeft: 15, flex: 1 }]}>Conditions Générales d'Utilisation</Text>
          <ChevronRight size={18} color="#8E8E93" />
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://example.com/rgpd')}>
          <Shield size={22} color="#AFC8FF" />
          <Text style={[styles.rowLabel, { color: isDark ? '#FFFFFF' : '#000000', marginLeft: 15, flex: 1 }]}>Politique de Confidentialité</Text>
          <ChevronRight size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>PORTABILITÉ</Text>
      <View style={[styles.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        <TouchableOpacity style={styles.row} onPress={exportData}>
          <Download size={22} color="#AFC8FF" />
          <Text style={[styles.rowLabel, { color: isDark ? '#FFFFFF' : '#000000', marginLeft: 15, flex: 1 }]}>Exporter mes données</Text>
          <ChevronRight size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>SUPPORT</Text>
      <View style={[styles.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Aide', 'Contactez le support à support@nora-ai.com')}>
          <HelpCircle size={22} color="#AFC8FF" />
          <Text style={[styles.rowLabel, { color: isDark ? '#FFFFFF' : '#000000', marginLeft: 15, flex: 1 }]}>Aide</Text>
          <ChevronRight size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', marginTop: 10, marginBottom: 40 }]}
        onPress={handleLogout}
      >
        <LogOut size={22} color="#FF3B30" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 28,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    marginVertical: 12,
    marginLeft: 37,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContent: {
    marginLeft: 15,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 15,
    color: '#8E8E93',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
  },
});
