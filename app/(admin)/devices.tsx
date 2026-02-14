/**
 * Device manager: list ESP32 sensors, assign or set as test.
 * Test devices are used by any driver; assigned devices are tied to one driver.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listenDevices, listenDrivers, setDeviceAssigned, setDeviceTest, startReading } from '@/src/services/firebaseService';
import { useAppTheme } from '@/src/context/ThemeContext';
import { wp, hp, fs, radius } from '@/constants/layout';

export default function DevicesScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const [devices, setDevices] = useState<Record<string, any>>({});
  const [drivers, setDrivers] = useState<Record<string, { username?: string; email?: string; active?: boolean }>>({});
  const [assignModal, setAssignModal] = useState<{ mac: string } | null>(null);

  useEffect(() => {
    const unsub = listenDevices(setDevices);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = listenDrivers((data: Record<string, { username?: string; email?: string; active?: boolean }> | null) => setDrivers(data || {}));
    return unsub;
  }, []);

  const deviceList = Object.entries(devices);
  const driverList = Object.entries(drivers).filter(([, d]) => d?.active !== false);

  const handleAssign = (mac: string, driverUid: string) => {
    setDeviceAssigned(mac, driverUid);
    setAssignModal(null);
  };

  const handleSetTest = (mac: string) => {
    setDeviceTest(mac);
    setAssignModal(null);
  };

  const handleStartReadingForDriver = (mac: string, driverUid: string) => {
    startReading(mac, {
      startReading: true,
      targetDriver: driverUid,
      requestedBy: 'admin',
      timestamp: Date.now(),
    });
    Alert.alert('Started', 'Reading command sent to device.');
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: wp(5), paddingBottom: hp(5) },
    empty: { color: colors.textSecondary, fontSize: fs(14) },
    card: {
      backgroundColor: colors.card,
      padding: wp(4),
      borderRadius: radius.lg,
      marginBottom: hp(1.5),
    },
    mac: {
      color: colors.text,
      fontFamily: 'monospace',
      fontWeight: '600',
      marginBottom: hp(0.5),
      fontSize: fs(14),
    },
    type: {
      fontSize: fs(14),
      color: colors.textSecondary,
      marginBottom: hp(1.5),
    },
    actions: {
      flexDirection: 'row' as const,
      gap: wp(2),
      flexWrap: 'wrap' as const,
    },
    assignBtn: {
      backgroundColor: colors.primary,
      paddingVertical: hp(1),
      paddingHorizontal: wp(4),
      borderRadius: radius.md,
    },
    assignBtnText: { color: '#fff', fontWeight: '600', fontSize: fs(14) },
    testBtn: {
      backgroundColor: colors.border,
      paddingVertical: hp(1),
      paddingHorizontal: wp(4),
      borderRadius: radius.md,
    },
    testBtnText: { fontWeight: '600' as const, fontSize: fs(14) },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalTouchable: { width: '100%' },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg * 1.5,
      borderTopRightRadius: radius.lg * 1.5,
      padding: wp(6),
      maxHeight: '75%',
    },
    modalTitle: {
      color: colors.text,
      fontSize: fs(18),
      fontWeight: '600',
      marginBottom: hp(1),
    },
    modalSubtitle: {
      fontSize: fs(14),
      color: colors.textSecondary,
      marginBottom: hp(1.5),
    },
    driverList: {
      maxHeight: hp(28),
      marginBottom: hp(1),
    },
    noDrivers: {
      color: colors.textSecondary,
      paddingVertical: hp(2),
      fontSize: fs(14),
    },
    driverRow: {
      paddingVertical: hp(1.75),
      paddingHorizontal: wp(1),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    driverRowText: { fontSize: fs(16), color: colors.text },
    testOption: {
      paddingVertical: hp(1.75),
      marginTop: hp(1),
    },
    testOptionText: { color: colors.textSecondary, fontSize: fs(14) },
    cancelBtn: { marginTop: hp(2), alignItems: 'center' as const },
    cancelBtnText: { color: colors.textSecondary, fontSize: fs(14) },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {deviceList.length === 0 ? (
        <Text style={styles.empty}>
          No devices yet. Power on an ESP32 sensor—it will auto-register when connected. You can then assign it to a driver.
        </Text>
      ) : (
        deviceList.map(([mac, data]) => (
          <View key={mac} style={styles.card}>
            <Text style={styles.mac}>{mac}</Text>
            <Text style={styles.type}>
              {data?.type === 'test' ? 'Test' : 'Assigned'}
              {data?.assignedDriver ? ` → ${drivers[data.assignedDriver]?.username || data.assignedDriver}` : ''}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.assignBtn}
                onPress={() => setAssignModal({ mac })}
              >
                <Text style={styles.assignBtnText}>
                  {data?.type === 'test' ? 'Assign driver' : 'Reassign'}
                </Text>
              </TouchableOpacity>
              {data?.type !== 'test' && (
                <TouchableOpacity
                  style={styles.testBtn}
                  onPress={() => handleSetTest(mac)}
                >
                  <Text style={styles.testBtnText}>Set as test</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}

      <Modal visible={!!assignModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAssignModal(null)}
        >
          <View
            style={styles.modalTouchable}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Assign device {assignModal?.mac}
              </Text>
              <Text style={styles.modalSubtitle}>Select a driver:</Text>
              <ScrollView style={styles.driverList} nestedScrollEnabled>
                {driverList.length === 0 ? (
                  <Text style={styles.noDrivers}>
                    No drivers yet. Create drivers from the Admin Dashboard first.
                  </Text>
                ) : (
                  driverList.map(([uid, d]) => (
                    <TouchableOpacity
                      key={uid}
                      style={styles.driverRow}
                      onPress={() => assignModal && handleAssign(assignModal.mac, uid)}
                    >
                      <Text style={styles.driverRowText}>
                        {d?.username || d?.email || uid}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              {assignModal && (
                <TouchableOpacity
                  style={styles.testOption}
                  onPress={() => handleSetTest(assignModal.mac)}
                >
                  <Text style={styles.testOptionText}>Mark as test device</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAssignModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}
