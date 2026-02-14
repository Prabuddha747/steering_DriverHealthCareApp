/**
 * Intro/landing screen shown when user is not logged in.
 * Displays app logo, title, feature bullets, and Login button.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/context/ThemeContext';

export default function IntroScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: { width: 120, height: 120, marginBottom: 16, borderRadius: 60, overflow: 'hidden' },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 8,
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    bullets: { alignSelf: 'stretch' },
    bullet: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    footer: { paddingBottom: 40 },
    loginBtn: {
      paddingVertical: 16,
      borderRadius: 4,
      alignItems: 'center',
    },
    loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  }), [colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Image source={require('@/assets/images/app_logo1.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Driver Health</Text>
        <Text style={styles.subtitle}>Smart steering-based driver health monitoring</Text>

        <View style={styles.bullets}>
          <Text style={styles.bullet}>• Real-time data via secure cloud</Text>
          <Text style={styles.bullet}>• Admin-controlled, driver-isolated</Text>
          <Text style={styles.bullet}>• Temperature & GSR sensors</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
