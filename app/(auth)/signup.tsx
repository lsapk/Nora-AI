import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Link, useRouter } from 'expo-router';
import { UserPlus } from 'lucide-react-native';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    setLoading(true);
    if (!isSupabaseConfigured) {
      Alert.alert('Configuration manquante', 'Ajoutez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans le fichier .env puis redémarrez Expo avec: npx expo start -c');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) Alert.alert(error.message);
    else {
      Alert.alert('Vérifiez votre boîte mail pour confirmer votre inscription !');
      router.replace('/login');
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
            <UserPlus size={48} color="#34C759" />
          </View>
          <Text style={styles.title}>Rejoignez Nora AI</Text>
          <Text style={styles.subtitle}>Commencez à prendre des notes intelligentes.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={signUpWithEmail}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Création...' : "S'inscrire"}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous avez déjà un compte ? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Se connecter</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C101A',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 60,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    fontSize: 17,
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#34C759',
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  linkText: {
    color: '#34C759',
    fontSize: 15,
    fontWeight: '600',
  },
});
