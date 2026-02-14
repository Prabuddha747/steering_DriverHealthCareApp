/**
 * Driver layout: drawer navigation with Refresh and Logout in header.
 * Screens: Live Monitor, Session History, GSR Graph.
 */
import { Drawer } from 'expo-router/drawer';
import { useRouter, usePathname } from 'expo-router';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useCallback } from 'react';

import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';

export default function DriverLayout() {
  const router = useRouter();
  const colors = useAppTheme();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    signOut();
    router.replace('/intro');
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Trigger refresh by navigating to the same route
    router.push(pathname as any);
    setTimeout(() => setRefreshing(false), 500);
  }, [pathname, router]);

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerPosition: 'left',
        drawerActiveTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        drawerStyle: { backgroundColor: colors.surface },
        sceneStyle: { backgroundColor: colors.background },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 16 }}>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              style={{ padding: 4 }}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="refresh" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Logout</Text>
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ drawerLabel: 'Live Monitor', title: 'Live Monitor' }}
      />
      <Drawer.Screen
        name="history"
        options={{ drawerLabel: 'Previous Data', title: 'Session History' }}
      />
      <Drawer.Screen
        name="gsr-graph"
        options={{ drawerLabel: 'GSR Graph', title: 'GSR Over Time' }}
      />
    </Drawer>
  );
}
