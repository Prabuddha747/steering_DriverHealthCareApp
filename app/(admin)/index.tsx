/**
 * Admin dashboard: drivers overview and device summary.
 * Shows total/active/disabled drivers, device list, and driver management actions (View, Disable).
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listenDrivers, listenDevices, disableDriver } from '@/src/services/firebaseService';
import { useAppTheme } from '@/src/context/ThemeContext';
import { wp, hp, fs, radius } from '@/constants/layout';

type DriverEntry = { uid: string; username?: string; email?: string; active?: boolean };

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const [drivers, setDrivers] = useState<Record<string, DriverEntry>>({});
  const [devices, setDevices] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubD = listenDrivers((data: Record<string, any>) => {
      const next: Record<string, DriverEntry> = {};
      Object.entries(data || {}).forEach(([uid, v]: [string, any]) => {
        next[uid] = { uid, username: v?.username, email: v?.email, active: v?.active !== false };
      });
      setDrivers(next);
    });
    return unsubD;
  }, []);

  useEffect(() => {
    const unsub = listenDevices(setDevices);
    return unsub;
  }, []);

  const driverList = Object.values(drivers);
  const totalDrivers = driverList.length;
  const activeDrivers = driverList.filter((d) => d.active).length;
  const disabledDrivers = totalDrivers - activeDrivers;
  const deviceList = Object.entries(devices || {});
  const testCount = deviceList.filter(([, d]: [string, any]) => d?.type === 'test').length;

  const testDeviceMac = deviceList.find(([, d]: [string, any]) => d?.type === 'test')?.[0] ?? null;

  const getAssignedDevice = (driverUid: string) => {
    const entry = deviceList.find(([, d]: [string, any]) => d?.type === 'assigned' && d?.assignedDriver === driverUid);
    if (entry) return entry[0];
    return testDeviceMac;
  };

  const getDeviceLabel = (driverUid: string) => {
    const assigned = deviceList.find(([, d]: [string, any]) => d?.type === 'assigned' && d?.assignedDriver === driverUid);
    if (assigned) return assigned[0];
    if (testDeviceMac) return `${testDeviceMac} (test)`;
    return 'None';
  };

  const handleDeleteDriver = (uid: string, name: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to disable driver "${name || uid}"? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, disable',
          style: 'destructive',
          onPress: () => disableDriver(uid),
        },
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: wp(5), paddingBottom: hp(5) },
    cards: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: wp(3), marginBottom: hp(3) },
    card: {
      backgroundColor: colors.card,
      padding: wp(4),
      borderRadius: radius.lg,
      minWidth: wp(25),
    },
    cardValue: { fontSize: fs(24), fontWeight: '700' as const, color: colors.text },
    cardLabel: { fontSize: fs(12), color: colors.textSecondary, marginTop: hp(0.5) },
    section: { marginBottom: hp(3) },
    sectionHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: hp(1.5),
    },
    sectionTitle: { fontSize: fs(18), fontWeight: '600' as const, color: colors.text },
    sectionSummary: { fontSize: fs(14), color: colors.textSecondary, marginBottom: hp(1.5) },
    addBtn: {
      backgroundColor: colors.primary,
      paddingVertical: hp(1),
      paddingHorizontal: wp(4),
      borderRadius: radius.md,
    },
    addBtnText: { color: '#fff', fontWeight: '600' as const, fontSize: fs(14) },
    emptyBox: { paddingVertical: hp(2.5) },
    empty: { color: colors.textSecondary, fontWeight: '600' as const, fontSize: fs(14) },
    emptySub: { color: colors.textSecondary, fontSize: fs(13), marginTop: hp(1) },
    row: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      padding: wp(4),
      borderRadius: radius.md,
      marginBottom: hp(1),
    },
    rowLeft: { flex: 1 },
    rowName: { fontWeight: '600' as const, fontSize: fs(16), color: colors.text },
    rowEmail: { fontSize: fs(12), color: colors.textSecondary, marginTop: hp(0.25) },
    rowDevice: { fontSize: fs(11), color: colors.textSecondary, marginTop: hp(0.25), fontFamily: 'monospace' },
    badge: {
      alignSelf: 'flex-start' as const,
      backgroundColor: '#dcfce7',
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.25),
      borderRadius: radius.sm,
      marginTop: hp(0.75),
    },
    badgeDisabled: { backgroundColor: '#fee2e2' },
    badgeText: { fontSize: fs(12), fontWeight: '500' as const },
    rowActions: { flexDirection: 'row' as const, gap: wp(2) },
    viewBtn: {
      backgroundColor: colors.border,
      paddingVertical: hp(0.75),
      paddingHorizontal: wp(3),
      borderRadius: radius.md,
    },
    viewBtnText: { fontWeight: '600' as const, fontSize: fs(14) },
    deleteBtn: {
      backgroundColor: '#fecaca',
      paddingVertical: hp(0.75),
      paddingHorizontal: wp(3),
      borderRadius: radius.md,
    },
    deleteBtnText: { color: '#b91c1c', fontWeight: '600' as const, fontSize: fs(14) },
    deviceMac: { fontFamily: 'monospace', fontSize: fs(12), color: colors.text },
    deviceType: { fontSize: fs(12), color: colors.textSecondary },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{totalDrivers}</Text>
          <Text style={styles.cardLabel}>Total drivers</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{activeDrivers}</Text>
          <Text style={styles.cardLabel}>Active</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{disabledDrivers}</Text>
          <Text style={styles.cardLabel}>Disabled</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{deviceList.length}</Text>
          <Text style={styles.cardLabel}>Devices</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{testCount}</Text>
          <Text style={styles.cardLabel}>Test sensors</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Driver management</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(admin)/create-driver')}
          >
            <Text style={styles.addBtnText}>+ Create driver</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSummary}>
          {totalDrivers} driver{totalDrivers !== 1 ? 's' : ''} total
          {totalDrivers > 0 && ` (${activeDrivers} active${disabledDrivers > 0 ? `, ${disabledDrivers} disabled` : ''})`}
        </Text>

        {driverList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>No drivers in Driver management</Text>
            <Text style={styles.emptySub}>
              If driver exist in Firebase Auth but need to be linked. Open Create driver from the menu and enter their email + current password to add them.
            </Text>
          </View>
        ) : (
          driverList.map((d) => (
              <View key={d.uid} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowName}>{d.username || d.email || d.uid}</Text>
                  <Text style={styles.rowEmail}>{d.email || '—'}</Text>
                  <Text style={styles.rowDevice}>
                    Device: {getDeviceLabel(d.uid)}
                  </Text>
                  <View style={[styles.badge, !d.active && styles.badgeDisabled]}>
                    <Text style={styles.badgeText}>{d.active ? 'Active' : 'Disabled'}</Text>
                  </View>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => router.push({ pathname: '/(admin)/driver/[id]', params: { id: d.uid } })}
                  >
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                  {d.active && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteDriver(d.uid, d.username || '')}
                    >
                      <Text style={styles.deleteBtnText}>Disable</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Devices</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(admin)/devices')}
          >
            <Text style={styles.addBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>
        {deviceList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>No data available</Text>
            <Text style={styles.emptySub}>Power on an ESP32 sensor to auto-register. Or manage devices to assign.</Text>
          </View>
        ) : (
          deviceList.slice(0, 5).map(([mac, data]: [string, any]) => (
            <View key={mac} style={styles.row}>
              <Text style={styles.deviceMac}>{mac}</Text>
              <Text style={styles.deviceType}>{data?.type === 'test' ? 'Test' : 'Assigned'}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
