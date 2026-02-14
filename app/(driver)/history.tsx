/**
 * Session history: list all past sessions (newest first).
 * Each card shows timestamp and metrics (temp, HR, SpO2, GSR).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { listenSessions } from '@/src/services/firebaseService';

const TEMP_NORMAL = 37;
const TEMP_WARN = 38;

function getTempColor(temp: number) {
  if (temp <= TEMP_NORMAL) return '#22c55e';
  if (temp <= TEMP_WARN) return '#eab308';
  return '#ef4444';
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const colors = useAppTheme();
  const uid = user?.uid ?? '';
  const [sessions, setSessions] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsub = listenSessions(uid, setSessions);
    return unsub;
  }, [uid]);

  const sessionList = Object.entries(sessions || {})
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: colors.text },
    emptyBox: { alignItems: 'center', paddingVertical: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    empty: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
    card: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 4,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    date: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
    dataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    dataValue: { fontSize: 15, color: colors.text },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>All sessions (newest first)</Text>
        {sessionList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.empty}>No data available</Text>
            <Text style={styles.emptySub}>Start a reading from Live Monitor to collect data.</Text>
          </View>
        ) : (
          sessionList.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.date}>
                {s.timestamp ? new Date(s.timestamp).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }) : '—'}
              </Text>
              <View style={styles.dataRow}>
                {s.temperature != null && (
                  <Text style={[styles.dataValue, { color: getTempColor(s.temperature) }]}>
                    {Number(s.temperature).toFixed(1)}°C
                  </Text>
                )}
                {s.heartRate != null && (
                  <Text style={styles.dataValue}>HR: {s.heartRate} bpm</Text>
                )}
                {s.spo2 != null && (
                  <Text style={styles.dataValue}>SpO2: {s.spo2}%</Text>
                )}
                {s.gsr != null && (
                  <Text style={styles.dataValue}>GSR: {s.gsr}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
