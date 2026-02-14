import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as XLSX from 'xlsx';

import { listenSessions, listenLatestSession, listenDrivers, startReading, stopReading } from '@/src/services/firebaseService';
import { listenDevices } from '@/src/services/firebaseService';
import { useAppTheme } from '@/src/context/ThemeContext';
import { wp, hp, fs, radius } from '@/constants/layout';

function toSafeFilename(name: string): string {
  const raw = (name || 'driver').toString();
  const beforeAt = raw.includes('@') ? raw.split('@')[0] : raw;
  const base = beforeAt.replace(/[^a-zA-Z0-9]/g, '');
  return base ? `${base}data` : 'driverdata';
}

function sessionsToSheetData(sessions: Record<string, any>): (string | number)[][] {
  const header = ['Session ID', 'Timestamp', 'Temperature', 'Heart Rate', 'SpO2', 'GSR'];
  const rows: (string | number)[][] = [header];
  Object.entries(sessions || {}).forEach(([id, s]) => {
    const ts = s?.timestamp ? new Date(s.timestamp).toISOString() : '';
    const temp = s?.temperature ?? '';
    const hr = s?.heartRate ?? '';
    const spo2 = s?.spo2 ?? '';
    const gsr = s?.gsr ?? '';
    rows.push([id, ts, temp, hr, spo2, gsr]);
  });
  return rows;
}

export default function DriverDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useAppTheme();
  const driverUid = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [latest, setLatest] = useState<any>(null);
  const [driverName, setDriverName] = useState('');
  const [devices, setDevices] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsub = listenSessions(driverUid, setSessions);
    return unsub;
  }, [driverUid]);

  useEffect(() => {
    const unsub = listenLatestSession(driverUid, setLatest);
    return unsub;
  }, [driverUid]);

  useEffect(() => {
    const unsub = listenDrivers((data) => {
      const d = data?.[driverUid];
      const name = d?.username || d?.email || driverUid;
      setDriverName(name);
      navigation.setOptions({ title: name });
    });
    return unsub;
  }, [driverUid, navigation]);

  useEffect(() => {
    const unsub = listenDevices(setDevices);
    return unsub;
  }, []);

  const sessionList = Object.entries(sessions || {})
    .map(([sid, s]) => ({ id: sid, ...s }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const handleExport = async () => {
    const data = sessionsToSheetData(sessions);
    const baseFilename = toSafeFilename(driverName);

    if (Platform.OS === 'web') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Sessions');
      const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([xlsxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFilename}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        const dir = FileSystem.cacheDirectory;
        if (!dir) {
          Alert.alert('Export', 'File system not available.');
          return;
        }
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Sessions');
        const xlsxBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const filename = `${baseFilename}.xlsx`;
        const fileUri = `${dir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, xlsxBuffer, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: `Export ${driverName}`,
          });
        } else {
          Alert.alert('Export', 'Sharing not available on this device.');
        }
      } catch (err: any) {
        Alert.alert('Export failed', err?.message || 'Could not export.');
      }
    }
  };

  const assignedMac = Object.entries(devices).find(
    ([, d]: [string, any]) => d?.type === 'assigned' && d?.assignedDriver === driverUid
  )?.[0];
  const testMac = Object.entries(devices).find(([, d]: [string, any]) => d?.type === 'test')?.[0];
  const deviceMac = assignedMac || testMac;

  const handleStartReading = () => {
    if (!deviceMac) {
      Alert.alert('No device', 'Assign a device to this driver first.');
      return;
    }
    startReading(deviceMac, {
      startReading: true,
      targetDriver: driverUid,
      requestedBy: 'admin',
      timestamp: Date.now(),
    });
    Alert.alert('Started', 'Reading command sent.');
  };

  const handleStopReading = () => {
    if (deviceMac) {
      stopReading(deviceMac);
      Alert.alert('Stopped', 'Stop command sent.');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: wp(4), paddingBottom: hp(4) },
    section: { marginBottom: hp(2) },
    sectionHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: hp(1),
    },
    sectionTitle: { fontSize: fs(14), fontWeight: '600' as const, marginBottom: hp(0.75), color: colors.text },
    dataCard: {
      backgroundColor: colors.card,
      padding: wp(3),
      borderRadius: radius.md,
    },
    dataGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: wp(4),
      marginBottom: hp(0.25),
    },
    dataRow: { fontSize: fs(13), color: colors.text },
    timestamp: { fontSize: fs(11), color: colors.textSecondary, marginTop: hp(0.5) },
    actions: { flexDirection: 'row' as const, gap: wp(2), marginBottom: hp(2) },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: hp(1),
      borderRadius: radius.md,
      alignItems: 'center' as const,
    },
    primaryBtnText: { color: '#fff', fontWeight: '600' as const, fontSize: fs(12) },
    secondaryBtn: {
      flex: 1,
      backgroundColor: colors.border,
      paddingVertical: hp(1),
      borderRadius: radius.md,
      alignItems: 'center' as const,
    },
    secondaryBtnText: { fontWeight: '600' as const, fontSize: fs(12) },
    exportBtn: {
      backgroundColor: '#22c55e',
      paddingVertical: hp(0.6),
      paddingHorizontal: wp(3),
      borderRadius: radius.sm,
    },
    exportBtnText: { color: '#fff', fontWeight: '600' as const, fontSize: fs(12) },
    emptyBox: { alignItems: 'center' as const, paddingVertical: hp(2.5), marginBottom: hp(2) },
    emptyIcon: { fontSize: fs(32), marginBottom: hp(1) },
    emptyTitle: { fontSize: fs(14), fontWeight: '600' as const, color: colors.textSecondary },
    emptySub: { fontSize: fs(12), color: colors.textSecondary, marginTop: hp(0.5), textAlign: 'center' as const },
    empty: { color: colors.textSecondary, fontSize: fs(12) },
    sessionRow: {
      backgroundColor: colors.card,
      padding: wp(2.5),
      borderRadius: radius.sm,
      marginBottom: hp(0.6),
    },
    sessionId: { fontFamily: 'monospace', fontSize: fs(11), marginBottom: hp(0.25), color: colors.text },
    sessionMeta: { fontSize: fs(12), color: colors.textSecondary },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!latest && sessionList.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No data available</Text>
          <Text style={styles.emptySub}>
            This driver has no sessions yet. Use Start reading above to begin collecting data for {driverName || 'this driver'}.
          </Text>
        </View>
      ) : null}
      {latest && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest session</Text>
          <View style={styles.dataCard}>
            <View style={styles.dataGrid}>
              {latest.temperature != null && (
                <Text style={styles.dataRow}>Temp: {Number(latest.temperature).toFixed(1)}°C</Text>
              )}
              {latest.heartRate != null && (
                <Text style={styles.dataRow}>HR: {Number(latest.heartRate)} bpm</Text>
              )}
              {latest.spo2 != null && (
                <Text style={styles.dataRow}>SpO2: {Number(latest.spo2)}%</Text>
              )}
              {latest.gsr != null && (
                <Text style={styles.dataRow}>GSR: {Number(latest.gsr).toFixed(0)}</Text>
              )}
            </View>
            {latest.timestamp && (
              <Text style={styles.timestamp}>
                {new Date(latest.timestamp).toLocaleString()}
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleStartReading}
          disabled={!deviceMac}
        >
          <Text style={styles.primaryBtnText}>Start reading</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleStopReading}
          disabled={!deviceMac}
        >
          <Text style={styles.secondaryBtnText}>Stop reading</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Session history</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Text style={styles.exportBtnText}>
              {Platform.OS === 'web' ? 'Export Excel' : 'Export'}
            </Text>
          </TouchableOpacity>
        </View>
        {sessionList.length === 0 ? (
          <Text style={styles.empty}>No data available. Sessions will appear here after readings.</Text>
        ) : (
          sessionList.slice(0, 20).map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <Text style={styles.sessionId}>{s.id}</Text>
              <Text style={styles.sessionMeta}>
                {s.timestamp ? new Date(s.timestamp).toLocaleString() : '—'} • Temp:{' '}
                {s.temperature != null ? `${Number(s.temperature).toFixed(1)}°C` : '—'} • HR:{' '}
                {s.heartRate != null ? s.heartRate : '—'} • SpO2:{' '}
                {s.spo2 != null ? s.spo2 : '—'} • GSR:{' '}
                {s.gsr != null ? s.gsr : '—'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
