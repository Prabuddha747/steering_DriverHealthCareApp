/**
 * Waiting screen: shown when user is disabled or role is loading.
 * Provides Refresh and Logout actions.
 */
import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { useRouter } from 'expo-router';

export default function WaitingScreen() {
  const { signOut, disabled } = useAuth();
  const router = useRouter();
  const colors = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      backgroundColor: colors.background,
    },
    icon: { fontSize: 56, marginBottom: 16 },
    title: {
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 12,
      color: colors.text,
    },
    message: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    refreshBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 4,
      marginBottom: 12,
    },
    refreshBtnText: { color: '#fff', fontWeight: '600' },
    logoutBtn: { paddingVertical: 12, marginTop: 8 },
    logoutBtnText: { color: colors.primary, fontWeight: '600' },
    logoutBtnTextMuted: { color: colors.textSecondary, fontWeight: '400' },
  }), [colors]);

  const handleRefresh = () => {
    router.replace('/');
  };

  const handleLogout = () => {
    signOut();
    router.replace('/intro');
  };

  const isDisabled = disabled === true;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.icon}>{isDisabled ? '🚫' : '⏳'}</Text>
      <Text style={styles.title}>{isDisabled ? 'Account disabled' : 'Please wait'}</Text>
      <Text style={styles.message}>
        {isDisabled
          ? 'Your account has been disabled by an administrator. Contact your admin for access.'
          : 'Loading your role. If this persists, check your connection and try again.'}
      </Text>
      <Text style={styles.subtext}>
        {isDisabled ? 'You can log out and try again later.' : 'Tap Refresh to retry.'}
      </Text>
      {!isDisabled && (
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={[styles.logoutBtnText, !isDisabled && styles.logoutBtnTextMuted]}>
          Logout
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
