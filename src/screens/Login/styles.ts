// src/screens/Login/styles.ts
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  // Logo
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  logoEmoji: { fontSize: 40 },
  brand: { fontSize: 26, fontWeight: '900', color: '#059669', letterSpacing: 0.5 },
  tagline: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 20 },

  // Inputs
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827' },
  eye: { fontSize: 18 },

  forgot: { alignSelf: 'flex-end', marginTop: 2, marginBottom: 16 },
  forgotTxt: { color: '#059669', fontSize: 13, fontWeight: '600' },

  // Botón
  btn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Demo box
  demoBox: {
    marginTop: 18,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  demoTitle: { fontSize: 12, fontWeight: '800', color: '#92400e', marginBottom: 4 },
  demoLine: { fontSize: 12, color: '#92400e', lineHeight: 18 },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerTxt: { marginHorizontal: 12, color: '#9ca3af', fontSize: 13 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerTxt: { color: '#6b7280', fontSize: 14 },
  footerLink: { color: '#059669', fontSize: 14, fontWeight: '800' },
});