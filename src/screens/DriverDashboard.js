import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { auth } from '../firebase';
import { listenDeviceStatus, startReading } from '../services/firebaseService';
import { evaluateConnection } from '../utils/connectionEvaluator';

export default function DriverDashboard() {
  const mac = 'AA:BB:CC:DD:EE:FF'; // temporary hardcoded device
  const [state, setState] = useState('NO_DATA');

  useEffect(() => {
    return listenDeviceStatus(mac, status => {
      setState(evaluateConnection(status?.lastSeen));
    });
  }, []);

  const userId = auth.currentUser?.uid;
  const canStartReading = state !== 'OFFLINE' && userId;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Dashboard</Text>
      <Text style={styles.state}>Sensor state: {state}</Text>

      {state === 'OFFLINE' && (
        <Text style={styles.hint}>Sensor offline. Power on the device.</Text>
      )}

      {state === 'NO_DATA' && (
        <Text style={styles.hint}>No readings yet.</Text>
      )}

      {!userId && (
        <Text style={styles.hint}>Sign in to start reading.</Text>
      )}

      <Button
        title="Start Reading"
        disabled={!canStartReading}
        onPress={() =>
          startReading(mac, {
            startReading: true,
            targetDriver: userId,
            requestedBy: 'driver',
            timestamp: Date.now(),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  state: { fontSize: 16, marginBottom: 8 },
  hint: { fontSize: 14, color: '#666', marginBottom: 12 },
});
