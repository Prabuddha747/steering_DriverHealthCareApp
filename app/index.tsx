import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAppTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';

export default function IndexScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const { user, role, loading, disabled } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/intro');
      return;
    }
    if (disabled) {
      router.replace('/waiting');
      return;
    }
    if (role === 'admin') {
      router.replace('/(admin)');
      return;
    }
    if (role === 'driver') {
      router.replace('/(driver)');
      return;
    }
    // role not resolved yet but user exists
    router.replace('/waiting');
  }, [user, role, loading, disabled]);

  const styles = StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" />
    </View>
  );
}
