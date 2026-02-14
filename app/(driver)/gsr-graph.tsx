/**
 * GSR graph: LineChart of Galvanic Skin Response over time.
 * Requires at least 2 sessions. Uses react-native-chart-kit.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';

import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { listenSessions } from '@/src/services/firebaseService';

export default function GsrGraphScreen() {
  const { user } = useAuth();
  const colors = useAppTheme();
  const uid = (user as { uid?: string } | null)?.uid ?? '';

  const chartConfig = useMemo(() => ({
  backgroundColor: colors.surface,
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.card,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(161, 161, 170, ${opacity})`,
  style: { borderRadius: 4, paddingRight: 20 },
  }), [colors]);
  const [sessions, setSessions] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsub = listenSessions(uid, setSessions);
    return unsub;
  }, [uid]);

  const sessionList = Object.entries(sessions || {})
    .map(([, s]) => s)
    .filter((s) => s.gsr != null && s.timestamp != null)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const gsrData = sessionList.map((s) => Number(s.gsr));

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4, color: colors.text },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
    emptyBox: { alignItems: 'center', paddingVertical: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    empty: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
    chartWrap: { marginTop: 8, marginBottom: 20 },
    chart: { borderRadius: 4 },
  }), [colors]);
  const maxLabels = 7;
  const step = Math.max(1, Math.floor(sessionList.length / maxLabels));
  const labels = sessionList.map((s, i) => {
    if (sessionList.length <= maxLabels) {
      return new Date(s.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return i % step === 0
      ? new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '';
  });
  const screenWidth = Dimensions.get('window').width - 48;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>GSR over time</Text>
        <Text style={styles.subtitle}>Galvanic Skin Response (stress/arousal indicator)</Text>
        {sessionList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.empty}>No data available</Text>
            <Text style={styles.emptySub}>Start a reading from Live Monitor to collect GSR data.</Text>
          </View>
        ) : gsrData.length < 2 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.empty}>No data available</Text>
            <Text style={styles.emptySub}>Need at least 2 sessions to show the graph.</Text>
          </View>
        ) : (
          <View style={styles.chartWrap}>
            <LineChart
              data={{
                labels,
                datasets: [{ data: gsrData }],
              }}
              width={screenWidth}
              height={260}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

