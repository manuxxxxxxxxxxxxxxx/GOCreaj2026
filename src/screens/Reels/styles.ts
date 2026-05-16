// src/screens/Reels/ReelsStyles.ts
import { Dimensions, StyleSheet } from 'react-native';

const { width: W } = Dimensions.get('window');

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  reel: { width: W, backgroundColor: '#000' },
  bg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  cameraBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: 8 },
  actions: { position: 'absolute', right: 12, bottom: 0, alignItems: 'center', gap: 20 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 48, height: 48, borderRadius: 999, borderWidth: 2, borderColor: '#fff' },
  followBtn: { position: 'absolute', bottom: -8, left: '50%', marginLeft: -10, width: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  followTxt: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 18 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 28 },
  actionTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bottomInfo: { position: 'absolute', left: 16, right: 80, bottom: 0 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  authorName: { color: '#fff', fontSize: 15, fontWeight: '900' },
  authorHandle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  desc: { color: '#fff', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  music: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 4 },
  distance: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 10 },
  productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 10, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  productImg: { width: 48, height: 48, borderRadius: 10 },
  productName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  productPrice: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  buyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  buyBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
});