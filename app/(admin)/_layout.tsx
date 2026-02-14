/**
 * Admin layout: drawer navigation with Refresh and Logout in header.
 * Screens: Dashboard, Create Driver, Devices, Export, Driver Details (hidden in drawer).
 */
import { Drawer } from 'expo-router/drawer';
import { useRouter, usePathname } from 'expo-router';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { signOut } from 'firebase/auth';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useCallback } from 'react';

import { auth } from '@/src/firebase';
import { useAppTheme } from '@/src/context/ThemeContext';

export default function AdminLayout() {
  const router = useRouter();
  const colors = useAppTheme();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    signOut(auth);
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
        options={{ drawerLabel: 'Dashboard', title: 'Admin Dashboard' }}
      />
      <Drawer.Screen
        name="create-driver"
        options={{ drawerLabel: 'Create Driver', title: 'Create Driver' }}
      />
      <Drawer.Screen
        name="devices"
        options={{ drawerLabel: 'Devices', title: 'Device Manager' }}
      />
      <Drawer.Screen
        name="export"
        options={{ drawerLabel: 'Export Data', title: 'Export Data' }}
      />
      <Drawer.Screen
        name="driver/[id]"
        options={{
          drawerItemStyle: { height: 0, overflow: 'hidden' },
          title: 'Driver Details',
        }}
      />
    </Drawer>
  );
}
