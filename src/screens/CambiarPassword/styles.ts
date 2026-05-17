// src/screens/CambiarPassword/styles.ts
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBtnTxt: { fontSize: 28, color: '#111', lineHeight: 28 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111' },

  scroll: { padding: 16, paddingBottom: 40 },

  iconWrap: { alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
  bigIcon: { fontSize: 44 },
  tagline: { marginTop: 8, color: '#6b7280', fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  label: { fontSize: 12, fontWeight: '800', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: '#111' },
  eye: { fontSize: 16, paddingHorizontal: 4 },

  errorHint: { fontSize: 12, color: '#ef4444', marginTop: 8, fontWeight: '700' },

  btn: { backgroundColor: '#059669', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#a7f3d0' },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
