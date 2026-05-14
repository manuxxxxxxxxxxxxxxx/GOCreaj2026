import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Radius, Shadow } from '../theme/colors';
import { DRIVERS } from '../data/catalog';
import { fmtMoney } from '../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'Delivery'>;

const STEPS = [
  { label: 'Pedido confirmado',   icon: '✓',  time: '10:32 AM' },
  { label: 'Preparando pedido',   icon: '👨‍🍳', time: '10:35 AM' },
  { label: 'Repartidor asignado', icon: '🛵',  time: '10:42 AM' },
  { label: 'En camino',           icon: '📍',  time: '10:45 AM' },
  { label: 'Entregado',           icon: '🏠',  time: null },
];

export default function DeliveryScreen({ navigation }: Props) {
  const [currentStep, setCurrentStep] = useState(3);
  const [eta,         setEta]         = useState(8);
  const driver = DRIVERS[0];
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();

    const timer = setInterval(() => {
      setEta((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCurrentStep(4);
          return 0;
        }
        return prev - 1;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rastrear Pedido</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Map placeholder */}
        <View style={styles.mapBox}>
          <Text style={styles.mapPlaceholder}>🗺️</Text>
          <Text style={styles.mapText}>Mapa en tiempo real</Text>
          <Animated.View style={[styles.pingDot, { transform: [{ scale: pulseAnim }] }]} />
          {currentStep < 4 && (
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>⏱ {eta} min restantes</Text>
            </View>
          )}
          {currentStep === 4 && (
            <View style={[styles.etaBadge, { backgroundColor: Colors.green }]}>
              <Text style={styles.etaText}>✓ ¡Entregado!</Text>
            </View>
          )}
        </View>

        {/* Driver card */}
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitials}>{driver.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.driverVehicle}>🛵 {driver.vehicle}</Text>
            <View style={styles.driverRating}>
              <Text style={styles.ratingText}>⭐ {driver.rating} · {driver.reviews} viajes</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => navigation.navigate('Chat' as any)}
          >
            <Text style={styles.chatBtnText}>💬 Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Status timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado del pedido</Text>
          {STEPS.map((step, idx) => {
            const done    = idx <= currentStep;
            const active  = idx === currentStep;
            return (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepIconCol}>
                  <View style={[styles.stepIcon, done && styles.stepIconDone, active && styles.stepIconActive]}>
                    <Text style={styles.stepIconText}>{done ? step.icon : ''}</Text>
                  </View>
                  {idx < STEPS.length - 1 && (
                    <View style={[styles.stepConnector, done && styles.stepConnectorDone]} />
                  )}
                </View>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
                  {step.time && done && <Text style={styles.stepTime}>{step.time}</Text>}
                  {active && !step.time && <Text style={styles.stepTime}>Ahora mismo</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Order summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen del pedido</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pedido #LM-48291</Text>
            <Text style={styles.summaryValue}>{fmtMoney(15.30)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Envío</Text>
            <Text style={styles.summaryValue}>{fmtMoney(2.50)}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8 }]}>
            <Text style={[styles.summaryLabel, { fontWeight: '700', color: Colors.text }]}>Total</Text>
            <Text style={[styles.summaryValue, { fontWeight: '800', fontSize: 16 }]}>{fmtMoney(17.80)}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  backText:        { fontSize: 16, color: Colors.blue, fontWeight: '600' },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: Colors.text },
  content:         { padding: 16, paddingBottom: 80 },
  mapBox: {
    height: 200, backgroundColor: '#c8d8e8', borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    overflow: 'hidden', position: 'relative',
  },
  mapPlaceholder:  { fontSize: 48, opacity: 0.4 },
  mapText:         { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  pingDot:         { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.blue + 'aa', borderWidth: 3, borderColor: Colors.blue },
  etaBadge:        { position: 'absolute', bottom: 12, backgroundColor: Colors.purple, paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full },
  etaText:         { color: Colors.white, fontWeight: '700', fontSize: 13 },
  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, ...Shadow.card,
  },
  driverAvatar:    { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.blue + '25', alignItems: 'center', justifyContent: 'center' },
  driverInitials:  { fontSize: 18, fontWeight: '700', color: Colors.blue },
  driverName:      { fontSize: 15, fontWeight: '700', color: Colors.text },
  driverVehicle:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  driverRating:    { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  ratingText:      { fontSize: 12, color: Colors.textMuted },
  chatBtn:         { backgroundColor: Colors.blue, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm },
  chatBtnText:     { color: Colors.white, fontWeight: '600', fontSize: 13 },
  card:            { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  cardTitle:       { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  stepRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepIconCol:     { alignItems: 'center', width: 32 },
  stepIcon:        { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  stepIconDone:    { borderColor: Colors.green, backgroundColor: Colors.green + '20' },
  stepIconActive:  { borderColor: Colors.blue, backgroundColor: Colors.blue + '20' },
  stepIconText:    { fontSize: 13 },
  stepConnector:   { width: 2, height: 32, backgroundColor: Colors.border, marginVertical: 4 },
  stepConnectorDone: { backgroundColor: Colors.green },
  stepInfo:        { flex: 1, paddingTop: 4, paddingBottom: 28 },
  stepLabel:       { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  stepLabelDone:   { color: Colors.text, fontWeight: '700' },
  stepTime:        { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel:    { fontSize: 13, color: Colors.textMuted },
  summaryValue:    { fontSize: 13, color: Colors.text, fontWeight: '600' },
});
