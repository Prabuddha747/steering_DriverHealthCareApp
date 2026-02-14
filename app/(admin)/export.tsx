/**
 * Export data screen: export all drivers' session data as CSV.
 * Format: Driver, Temperature, Heart Rate, SpO2, GSR, Timestamp, Date — one row per session.
 * Shares file on native; downloads on web.
 */
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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { listenDrivers, getSessions } from '@/src/services/firebaseService';
import { useAppTheme } from '@/src/context/ThemeContext';
import { wp, hp, fs, radius } from '@/constants/layout';

type DriverEntry = { uid: string; username?: string; email?: string };

type SessionRow = {
  timestamp: number;
  driverKey: string;
  temperature?: number;
  heartRate?: number;
  spo2?: number;
  gsr?: number;
};

function buildDriverKey(d: DriverEntry): string {
  const raw = (d.username || d.email?.toString().split('@')[0] || d.uid || '').toString();
  const name = raw.replace(/[^a-zA-Z0-9]/g, '_');
  return name || `driver_${d.uid.slice(0, 8)}`;
}

function buildExportCSV(
  drivers: DriverEntry[],
  allSessions: Record<string, Record<string, any>>
): string {
  const seen = new Set<string>();
  const driverToKey: Record<string, string> = {};
  drivers.forEach((d) => {
    let k = buildDriverKey(d);
    if (seen.has(k)) k = `${k}_${d.uid.slice(0, 8)}`;
    seen.add(k);
    driverToKey[d.uid] = k;
  });

  // Format: each row = Driver, Temperature, Heart Rate, SpO2, GSR, Timestamp, Date
  const header = 'Driver,Temperature,Heart Rate,SpO2,GSR,Timestamp,Date';

  const rows: SessionRow[] = [];
  drivers.forEach((d) => {
    const sess = allSessions[d.uid] || {};
    const dk = driverToKey[d.uid];
    Object.entries(sess).forEach(([, s]: [string, any]) => {
      rows.push({
        timestamp: s?.timestamp ?? 0,
        driverKey: dk,
        temperature: s?.temperature,
        heartRate: s?.heartRate,
        spo2: s?.spo2,
        gsr: s?.gsr,
      });
    });
  });
  rows.sort((a, b) => a.timestamp - b.timestamp);

  const csvRows = [header];
  rows.forEach((r) => {
    const ts = r.timestamp ? new Date(r.timestamp).toISOString() : '';
    const date = r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '';
    const temp = r.temperature ?? '';
    const hr = r.heartRate ?? '';
    const spo2 = r.spo2 ?? '';
    const gsr = r.gsr ?? '';
    const cells = [r.driverKey, temp, hr, spo2, gsr, ts, date];
    csvRows.push(cells.map((c) => (c === undefined || c === null ? '' : String(c))).join(','));
  });

  return csvRows.join('\n');
}

export default function ExportScreen() {
  const colors = useAppTheme();
  const [drivers, setDrivers] = useState<DriverEntry[]>([]);
  const [allSessions, setAllSessions] = useState<Record<string, Record<string, any>>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const unsub = listenDrivers((data: Record<string, any>) => {
      const list: DriverEntry[] = Object.entries(data || {}).map(([uid, v]: [string, any]) => ({
        uid,
        username: v?.username,
        email: v?.email,
      }));
      setDrivers(list);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const driversList = drivers;
      const sess: Record<string, Record<string, any>> = {};
      for (const d of driversList) {
        if (cancelled) return;
        const data = await getSessions(d.uid);
        sess[d.uid] = data;
      }
      if (!cancelled) setAllSessions(sess);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers]);

  const csv = drivers.length > 0 ? buildExportCSV(drivers, allSessions) : '';
  const hasData = Object.values(allSessions).some((s) => Object.keys(s || {}).length > 0);

  const handleDownload = async () => {
    if (!csv) {
      Alert.alert('No data', 'No sessions to export yet.');
      return;
    }
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `driver-health-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const dir = FileSystem.cacheDirectory;
        if (!dir) {
          await Clipboard.setStringAsync(csv);
          Alert.alert('Export', 'CSV data copied to clipboard.');
          return;
        }
        const filename = `driver-health-export-${new Date().toISOString().slice(0, 10)}.csv`;
        const fileUri = `${dir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Driver Health Data',
          });
        } else {
          await Clipboard.setStringAsync(csv);
          Alert.alert('Export', 'CSV data copied to clipboard. Sharing not available on this device.');
        }
      }
    } catch (err: any) {
      Alert.alert('Export failed', err?.message || 'Could not export data.');
    } finally {
      setExporting(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: wp(5), paddingBottom: hp(5) },
    title: { fontSize: fs(22), fontWeight: '700', marginBottom: hp(1), color: colors.text },
    subtitle: { fontSize: fs(14), color: colors.textSecondary, marginBottom: hp(3) },
    status: { fontSize: fs(14), color: colors.textSecondary, marginBottom: hp(2) },
    emptyBox: { paddingVertical: hp(2.5), marginBottom: hp(3) },
    empty: { color: colors.textSecondary, fontWeight: '600', fontSize: fs(14) },
    emptySub: { fontSize: fs(13), color: colors.textSecondary, marginTop: hp(1) },
    stats: { marginBottom: hp(2.5) },
    statsText: { fontSize: fs(14), color: colors.textSecondary },
    actions: { gap: wp(3), marginBottom: hp(3) },
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingVertical: hp(1.75),
      borderRadius: radius.lg,
      alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: fs(14) },
    btnDisabled: { opacity: 0.5 },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Export data</Text>
        <Text style={styles.subtitle}>
          Download health data. Format: Driver, Temperature, Heart Rate, SpO2, GSR, Timestamp, Date — one row per session.
        </Text>

        {loading ? (
          <Text style={styles.status}>Loading sessions…</Text>
        ) : !hasData ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>No session data to export</Text>
            <Text style={styles.emptySub}>
              Sessions will appear here after drivers collect data from sensors.
            </Text>
          </View>
        ) : (
          <View style={styles.stats}>
            <Text style={styles.statsText}>
              {drivers.length} driver{drivers.length !== 1 ? 's' : ''} •{' '}
              {Object.values(allSessions).reduce(
                (acc, s) => acc + Object.keys(s || {}).length,
                0
              )}{' '}
              sessions
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!hasData || exporting) && styles.btnDisabled]}
            onPress={handleDownload}
            disabled={!hasData || exporting}
          >
            <Text style={styles.primaryBtnText}>
              {Platform.OS === 'web' ? 'Download CSV' : 'Share / Export CSV'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
