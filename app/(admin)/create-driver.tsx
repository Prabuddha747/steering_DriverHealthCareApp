/**
 * Create driver screen: add new driver accounts.
 * Fields: username, email, driver password, admin password (for auth).
 * Links existing Firebase Auth users if email + current password provided.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { createDriverUser } from '@/src/services/firebaseService';
import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';

export default function CreateDriverScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const { user: authUser } = useAuth();
  const user = authUser as { email?: string } | null;
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    const u = username.trim();
    const e = email.trim();
    const p = password.trim();
    const adminP = adminPassword.trim();
    if (!u || !e || !p || !adminP) {
      setError('Fill all fields including your admin password');
      return;
    }
    setLoading(true);
    try {
      await createDriverUser(e, p, u, adminP);
      Alert.alert('Success', 'Driver account created.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to create driver');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, backgroundColor: colors.background },
    form: { width: '100%' },
    linkBanner: {
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: 4,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    linkBannerTitle: { fontWeight: '700', fontSize: 14, marginBottom: 6, color: colors.text },
    linkBannerText: { fontSize: 13, color: colors.textSecondary },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      marginBottom: 16,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    error: { color: colors.error, marginBottom: 12 },
    hint: { color: colors.textSecondary, fontSize: 12, marginBottom: 16 },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 4,
      alignItems: 'center',
    },
    btnDisabled: { opacity: 0.7 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <View style={styles.linkBanner}>
          <Text style={styles.linkBannerTitle}>Driver already in Firebase Auth?</Text>
          <Text style={styles.linkBannerText}>
            If driver1 or driver2 exist in Auth but don't show in Driver management, enter their email + current password below. They will be linked to the app.
          </Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Driver password (or current password to link existing)"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder={`Password for ${user?.email || 'admin'}`}
          placeholderTextColor={colors.textSecondary}
          value={adminPassword}
          onChangeText={setAdminPassword}
          secureTextEntry
          editable={!loading}
        />
        <Text style={styles.hint}>
          Field 4: Your admin password for {user?.email || 'this account'}.{'\n'}
          If the driver already exists in Firebase Auth, field 3 must be their current password to link.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
