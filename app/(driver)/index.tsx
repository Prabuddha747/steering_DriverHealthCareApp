/**
 * Driver live monitor: start/stop sensor reading, view live health data.
 * Shows temperature, heart rate, SpO2, GSR. Uses assigned or test device.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import {
  listenDeviceStatus,
  startReading,
  stopReading,
  listenLatestSession,
  listenDevices,
  listenDrivers,
} from '@/src/services/firebaseService';
import { evaluateConnection } from '@/src/utils/connectionEvaluator';
import { CONNECTION_STATE } from '@/src/config/constants';
import { SENSOR_COUNTDOWN_SEC } from '@/src/config/constants';

const TEMP_NORMAL = 37;
const TEMP_WARN = 38;

function getTempColor(temp: number) {
  if (temp <= TEMP_NORMAL) return '#22c55e';
  if (temp <= TEMP_WARN) return '#eab308';
  return '#ef4444';
}

export default function DriverDashboardScreen() {
  const { user } = useAuth();
  const colors = useAppTheme();
  const uid = user?.uid ?? '';

  const [deviceMac, setDeviceMac] = useState<string | null>(null);
  const [deviceList, setDeviceList] = useState<{ mac: string; type: string }[]>([]);
  const [driverName, setDriverName] = useState<string>('');
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.NO_DATA);
  const [readingActive, setReadingActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [latestSession, setLatestSession] = useState<any>(null);
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  // Resolve which device this driver uses (assigned or test)
  useEffect(() => {
    const unsub = listenDevices((devices: Record<string, any>) => {
      const list: { mac: string; type: string }[] = [];
      let assigned: string | null = null;
      Object.entries(devices || {}).forEach(([mac, data]: [string, any]) => {
        if (data?.type === 'assigned' && data?.assignedDriver === uid) {
          assigned = mac;
        }
        list.push({ mac, type: data?.type || 'unknown' });
      });
      if (assigned) {
        setDeviceMac(assigned);
      } else if (list.length > 0) {
        const test = list.find((d) => d.type === 'test');
        if (test) setDeviceMac(test.mac);
        else setDeviceMac(list[0].mac);
      } else {
        setDeviceMac('AA:BB:CC:DD:EE:FF');
      }
      setDeviceList(list);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!deviceMac) return;
    const unsub = listenDeviceStatus(deviceMac, (status: { lastSeen?: number }) => {
      setConnectionState(evaluateConnection(status?.lastSeen));
    });
    return unsub;
  }, [deviceMac]);

  useEffect(() => {
    const unsub = listenDrivers((data: Record<string, any>) => {
      const d = data?.[uid];
      setDriverName(d?.username || d?.email || user?.email || '');
    });
    return unsub;
  }, [uid, user?.email]);

  useEffect(() => {
    const unsub = listenLatestSession(uid, setLatestSession);
    return unsub;
  }, [uid]);

  const startCountdownThenReading = useCallback(() => {
    if (!deviceMac || connectionState === CONNECTION_STATE.OFFLINE) return;
    setCountdown(SENSOR_COUNTDOWN_SEC);
  }, [deviceMac, connectionState]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      if (countdown === 0 && deviceMac) {
        startReading(deviceMac, {
          startReading: true,
          targetDriver: uid,
          requestedBy: 'driver',
          timestamp: Date.now(),
        });
        setReadingActive(true);
      }
      if (countdown !== null) setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, deviceMac, uid]);

  // Auto-start countdown 10s after login (once when device is ready)
  const [autoStartDone, setAutoStartDone] = useState(false);
  useEffect(() => {
    if (autoStartDone || !deviceMac || connectionState === CONNECTION_STATE.OFFLINE || readingActive || countdown !== null) return;
    const t = setTimeout(() => {
      setCountdown(SENSOR_COUNTDOWN_SEC);
      setAutoStartDone(true);
    }, 500);
    return () => clearTimeout(t);
  }, [autoStartDone, deviceMac, connectionState, readingActive, countdown]);

  const handleStopReading = () => {
    if (deviceMac) {
      stopReading(deviceMac);
      setReadingActive(false);
    }
  };

  // Cleanup: stop reading when leaving (e.g. logout)
  useEffect(() => {
    return () => {
      if (deviceMac) stopReading(deviceMac);
    };
  }, [deviceMac]);

  const hasData = latestSession && (latestSession.temperature != null || latestSession.gsr != null);
  const displayName = deviceList.find((d) => d.mac === deviceMac)?.type === 'test' ? 'Test Sensor' : (deviceMac || '—');

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 40 },
    driverBadge: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
    statusCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 4,
      marginBottom: 16,
    },
    statusLabel: { fontSize: 14, color: colors.textSecondary },
    statusValue: { fontSize: 16, fontWeight: '600', marginTop: 4, color: colors.text },
    countdownBox: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 4,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    countdownText: { fontSize: 15, fontWeight: '600', color: colors.text },
    sorryBox: { padding: 24, alignItems: 'center', marginBottom: 20 },
    sorryIcon: { fontSize: 48, marginBottom: 12 },
    sorryTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: colors.text },
    sorryMessage: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
    sorrySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    controls: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 4,
      alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '600' },
    secondaryBtn: {
      flex: 1,
      backgroundColor: colors.border,
      paddingVertical: 14,
      borderRadius: 4,
      alignItems: 'center',
    },
    secondaryBtnText: { color: colors.text, fontWeight: '600' },
    btnDisabled: { opacity: 0.6 },
    dataSection: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 4,
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: colors.text },
    dataIsolationNote: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
    dataRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    dataLabel: { color: colors.textSecondary },
    dataValue: { fontSize: 18, fontWeight: '600', color: colors.text },
    timestamp: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  }), [colors]);

  if (!hasData && connectionState !== CONNECTION_STATE.OFFLINE && !readingActive) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {driverName ? (
          <Text style={styles.driverBadge}>Your data • {driverName}</Text>
        ) : null}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Device: {displayName}</Text>
          <Text style={styles.statusValue}>
            {connectionState === CONNECTION_STATE.CONNECTED && '🟢 Ready'}
            {connectionState === CONNECTION_STATE.STALE && '🟡 Waiting'}
            {connectionState === CONNECTION_STATE.OFFLINE && '🔴 Offline'}
            {connectionState === CONNECTION_STATE.NO_DATA && '🟡 Waiting'}
          </Text>
        </View>
        {countdown !== null && countdown > 0 && (
          <View style={styles.countdownBox}>
            <Text style={styles.countdownText}>Sensor will start in {countdown}s</Text>
          </View>
        )}
        {countdown === 0 && (
          <View style={styles.countdownBox}>
            <Text style={styles.countdownText}>Reading started.</Text>
          </View>
        )}
        <View style={styles.sorryBox}>
          <Text style={styles.sorryIcon}>📭</Text>
          <Text style={styles.sorryTitle}>No data available</Text>
          <Text style={styles.sorryMessage}>
            Waiting for data or connection issue with the hardware.
          </Text>
          <Text style={styles.sorrySub}>
            Ensure the sensor is powered and tap Start Reading below.
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={startCountdownThenReading}>
          <Text style={styles.primaryBtnText}>Start Reading</Text>
        </TouchableOpacity>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {driverName ? (
        <Text style={styles.driverBadge}>Your data • {driverName}</Text>
      ) : null}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Device: {displayName}</Text>
        <Text style={styles.statusValue}>
          {connectionState === CONNECTION_STATE.CONNECTED && '🟢 Ready'}
          {connectionState === CONNECTION_STATE.STALE && '🟡 Waiting'}
          {connectionState === CONNECTION_STATE.OFFLINE && '🔴 Offline'}
          {connectionState === CONNECTION_STATE.NO_DATA && '🟡 Waiting'}
        </Text>
      </View>

      {countdown !== null && countdown > 0 && (
        <View style={styles.countdownBox}>
          <Text style={styles.countdownText}>Sensor will start in {countdown}s</Text>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.primaryBtn, readingActive && styles.btnDisabled]}
          onPress={startCountdownThenReading}
          disabled={readingActive || connectionState === CONNECTION_STATE.OFFLINE}
        >
          <Text style={styles.primaryBtnText}>Start Reading</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleStopReading}
          disabled={!readingActive}
        >
          <Text style={styles.secondaryBtnText}>Stop Reading</Text>
        </TouchableOpacity>
      </View>

      {latestSession && (
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Live data</Text>
          <Text style={styles.dataIsolationNote}>Stored under your account only. Other drivers cannot see this.</Text>
          {latestSession.temperature != null && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Temperature</Text>
              <Text style={[styles.dataValue, { color: getTempColor(latestSession.temperature) }]}>
                {Number(latestSession.temperature).toFixed(1)} °C
              </Text>
            </View>
          )}
          {latestSession.heartRate != null && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Heart Rate</Text>
              <Text style={styles.dataValue}>{Number(latestSession.heartRate)} bpm</Text>
            </View>
          )}
          {latestSession.spo2 != null && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>SpO2</Text>
              <Text style={styles.dataValue}>{Number(latestSession.spo2)} %</Text>
            </View>
          )}
          {latestSession.gsr != null && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>GSR</Text>
              <Text style={styles.dataValue}>{Number(latestSession.gsr).toFixed(0)}</Text>
            </View>
          )}
          {latestSession.timestamp && (
            <Text style={styles.timestamp}>
              Last updated: {Math.round((Date.now() - latestSession.timestamp) / 1000)}s ago
            </Text>
          )}
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}
