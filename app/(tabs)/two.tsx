import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Linking, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { LogOut, Shield, FileText, HelpCircle, ChevronRight, Lock, Mail } from 'lucide-react-native';

export default function SettingsScreen() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async () => {
    if (!newPassword) return;
    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdating(false);
    if (error) Alert.alert('Erreur', error.message);
    else {
      Alert.alert('Succès', 'Mot de passe mis à jour.');
      setNewPassword('');
    }
  };

  const updateEmail = async () => {
    if (!newEmail) return;
    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setIsUpdating(false);
    if (error) Alert.alert('Erreur', error.message);
    else {
      Alert.alert('Succès', 'Un email de confirmation a été envoyé à la nouvelle adresse.');
      setNewEmail('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <Text style={styles.sectionTitle}>PROFIL</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Mail size={20} color="#007AFF" />
          <View style={styles.rowContent}>
            <TextInput
              placeholder="Changer d'email"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.currentVal}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={[styles.updateBtn, !newEmail && styles.disabled]} onPress={updateEmail} disabled={!newEmail || isUpdating}>
            <Text style={styles.updateBtnText}>MAJ</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.separator} />
        <View style={styles.row}>
          <Lock size={20} color="#007AFF" />
          <View style={styles.rowContent}>
            <TextInput
              secureTextEntry
              placeholder="Nouveau mot de passe"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
            />
          </View>
          <TouchableOpacity style={[styles.updateBtn, !newPassword && styles.disabled]} onPress={updatePassword} disabled={!newPassword || isUpdating}>
            <Text style={styles.updateBtnText}>MAJ</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>SUPPORT & LÉGAL</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Aide', 'Contactez-nous à support@nora-ai.com')}>
          <HelpCircle size={20} color="#007AFF" />
          <Text style={styles.rowLabelFull}>Centre d'aide</Text>
          <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://example.com/cgu')}>
          <FileText size={20} color="#007AFF" />
          <Text style={styles.rowLabelFull}>Conditions d'Utilisation</Text>
          <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://example.com/rgpd')}>
          <Shield size={20} color="#007AFF" />
          <Text style={styles.rowLabelFull}>Confidentialité (RGPD)</Text>
          <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontSize: 34, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  section: { marginHorizontal: 16, borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, backgroundColor: '#1C1C1E' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginLeft: 32, marginBottom: 8, textTransform: 'uppercase' },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 36 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowContent: { marginLeft: 16, flex: 1 },
  currentVal: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  input: { fontSize: 16, color: '#FFF', padding: 0 },
  rowLabelFull: { fontSize: 17, color: '#FFF', marginLeft: 16, flex: 1 },
  updateBtn: { backgroundColor: '#007AFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  updateBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.3 },
  logoutButton: { marginHorizontal: 16, borderRadius: 20, padding: 18, backgroundColor: '#1C1C1E', alignItems: 'center', marginTop: 8, marginBottom: 40 },
  logoutText: { color: '#FF453A', fontSize: 17, fontWeight: '700' },
});
