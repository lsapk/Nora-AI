import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase, setRememberMePreference } from '../../lib/supabase';
import { Link, useRouter } from 'expo-router';
import { LogIn, CheckSquare, Square } from 'lucide-react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);

    // Set the preference before signing in
    setRememberMePreference(rememberMe);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Erreur de connexion', error.message);
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LogIn size={42} color="#007AFF" />
          </View>
          <Text style={styles.title}>Nora AI</Text>
          <Text style={styles.subtitle}>Votre second cerveau, augmenté par l'IA.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            {rememberMe ? (
              <CheckSquare size={20} color="#007AFF" />
            ) : (
              <Square size={20} color="rgba(255,255,255,0.3)" />
            )}
            <Text style={styles.rememberMeText}>Se souvenir de moi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={signInWithEmail}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas de compte ? </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>S'inscrire</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  logoContainer: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { fontSize: 34, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  subtitle: { fontSize: 17, color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' },
  form: { width: '100%' },
  inputContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 60,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  input: { fontSize: 17, color: '#FFF' },
  rememberMeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 10, paddingLeft: 4 },
  rememberMeText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500' },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
  linkText: { color: '#007AFF', fontSize: 15, fontWeight: '700' },
});
