import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Switch,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../hooks/useAuth';
import { useOrders } from '../hooks/useOrders';
import Toast from '../components/Toast';
import { Colors, Radius, Shadow } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout, updateProfile } = useAuth();
  const { stats }                       = useOrders();

  const [editing,     setEditing]     = useState(false);
  const [name,        setName]        = useState(user?.name     ?? '');
  const [email,       setEmail]       = useState(user?.email    ?? '');
  const [phone,       setPhone]       = useState(user?.phone    ?? '');
  const [address,     setAddress]     = useState(user?.address  ?? '');
  const [bio,         setBio]         = useState(user?.bio      ?? '');
  const [notifs,      setNotifs]      = useState(true);
  const [darkMode,    setDarkMode]    = useState(false);
  const [toast,       setToast]       = useState({ visible: false, message: '' });

  function showToast(msg: string) { setToast({ visible: true, message: msg }); }

  async function handleSave() {
    await updateProfile({ name, email, phone, address, bio });
    setEditing(false);
    showToast('Perfil actualizado ✓');
  }

  async function handleLogout() {
    await logout();
    navigation.replace('Login' as any);
  }

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const ROLE_LABELS: Record<string, string> = {
    buyer:        '🛒 Comprador',
    seller:       '🏪 Vendedor',
    driver:       '🛵 Repartidor',
    admin:        '⚙️ Admin',
    master_admin: '👑 Master Admin',
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
          <Text style={styles.editText}>{editing ? 'Guardar' : 'Editar'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Avatar + stats */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name ?? 'Mi perfil'}</Text>
          <Text style={styles.userRole}>{ROLE_LABELS[user?.role ?? 'buyer']}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{stats.count}</Text>
              <Text style={styles.statLabel}>Pedidos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>${stats.totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Ahorros</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>4.9</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Edit form */}
        {editing ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información personal</Text>
            <Field label="Nombre" value={name} onChange={setName} />
            <Field label="Correo" value={email} onChange={setEmail} keyboardType="email-address" />
            <Field label="Teléfono" value={phone} onChange={setPhone} keyboardType="phone-pad" />
            <Field label="Dirección" value={address} onChange={setAddress} />
            <Field label="Bio" value={bio} onChange={setBio} multiline />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información personal</Text>
            <InfoRow label="Nombre"    value={user?.name    || '—'} />
            <InfoRow label="Correo"    value={user?.email   || '—'} />
            <InfoRow label="Teléfono"  value={user?.phone   || '—'} />
            <InfoRow label="Dirección" value={user?.address || '—'} />
            {user?.bio && <InfoRow label="Bio" value={user.bio} />}
          </View>
        )}

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Configuración</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingLabel}>Notificaciones</Text>
            </View>
            <Switch
              value={notifs}
              onValueChange={setNotifs}
              trackColor={{ false: Colors.border, true: Colors.blue + '80' }}
              thumbColor={notifs ? Colors.blue : Colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌙</Text>
              <Text style={styles.settingLabel}>Modo oscuro</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: Colors.border, true: Colors.blue + '80' }}
              thumbColor={darkMode ? Colors.blue : Colors.textMuted}
            />
          </View>

          {[
            { icon: '💳', label: 'Métodos de pago',   route: undefined },
            { icon: '🔒', label: 'Privacidad',         route: undefined },
            { icon: '❓', label: 'Soporte',            route: undefined },
            { icon: '📋', label: 'Historial de pedidos', route: 'Historial' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.settingRow}
              onPress={() => item.route ? navigation.navigate(item.route as any) : showToast('Próximamente')}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>{item.icon}</Text>
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Role-based dashboard */}
        {(user?.role === 'seller' || user?.role === 'driver' || user?.role === 'admin' || user?.role === 'master_admin') && (
          <TouchableOpacity
            style={styles.dashBtn}
            onPress={() => {
              const route = user.role === 'seller' ? 'SellerDashboard' : user.role === 'driver' ? 'DriverDashboard' : 'AdminDashboard';
              navigation.navigate(route as any);
            }}
          >
            <Text style={styles.dashBtnText}>📊 Ir al Dashboard</Text>
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>
      <Toast message={toast.message} visible={toast.visible} onHide={() => setToast({ visible: false, message: '' })} />
    </View>
  );
}

function Field({
  label, value, onChange, keyboardType, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: 'email-address' | 'phone-pad'; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text, backgroundColor: Colors.inputBg },
});

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: 13, color: Colors.textMuted },
  value: { fontSize: 13, color: Colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  backText:        { fontSize: 16, color: Colors.blue, fontWeight: '600' },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: Colors.text },
  editText:        { fontSize: 15, color: Colors.blue, fontWeight: '600' },
  content:         { padding: 16, paddingBottom: 80 },
  profileHeader:   { alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  avatar:          { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:      { fontSize: 26, fontWeight: '700', color: Colors.white },
  userName:        { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  userRole:        { fontSize: 13, color: Colors.textMuted, marginBottom: 18 },
  statsRow:        { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stat:            { alignItems: 'center' },
  statNum:         { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel:       { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statDivider:     { width: 1, height: 32, backgroundColor: Colors.border },
  card:            { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  cardTitle:       { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  saveBtn:         { backgroundColor: Colors.blue, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:     { color: Colors.white, fontWeight: '700', fontSize: 15 },
  settingRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon:     { fontSize: 18, width: 28 },
  settingLabel:    { fontSize: 14, color: Colors.text, fontWeight: '500' },
  chevron:         { fontSize: 20, color: Colors.textMuted },
  dashBtn:         { backgroundColor: Colors.purple, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  dashBtnText:     { color: Colors.white, fontWeight: '700', fontSize: 15 },
  logoutBtn:       { backgroundColor: Colors.red + '18', borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: Colors.red + '40', marginBottom: 8 },
  logoutBtnText:   { color: Colors.red, fontWeight: '700', fontSize: 15 },
});
