import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

const CATS = [
  { id: 1, name: 'Comida', icon: '🍔', count: '234 tiendas', color: '#fef3c7', border: '#f59e0b' },
  { id: 2, name: 'Artesanías', icon: '🏺', count: '87 tiendas', color: '#ede9fe', border: '#7c3aed' },
  { id: 3, name: 'Moda Local', icon: '👗', count: '156 tiendas', color: '#fce7f3', border: '#ec4899' },
  { id: 4, name: 'Mercado', icon: '🥦', count: '312 tiendas', color: '#dcfce7', border: '#059669' },
  { id: 5, name: 'Cafeterías', icon: '☕', count: '45 tiendas', color: '#fff7ed', border: '#f97316' },
  { id: 6, name: 'Plantas', icon: '🌿', count: '28 tiendas', color: '#dcfce7', border: '#16a34a' },
  { id: 7, name: 'Servicios', icon: '🛠️', count: '190 tiendas', color: '#f0f9ff', border: '#0ea5e9' },
  { id: 8, name: 'Inversiones', icon: '📈', count: '12 proyectos', color: '#fff7ed', border: '#f59e0b' },
];

const PROJECTS = [
  { id: 1, name: 'Café Artesanal SV', goal: '$50,000', raised: '$32,400', pct: 65, author: 'Carlos M.', return: '12% anual', image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=300&q=80' },
  { id: 2, name: 'Tortillería Doña Rosa', goal: '$20,000', raised: '$18,000', pct: 90, author: 'Rosa G.', return: '8% anual', image: 'https://images.unsplash.com/photo-1615312090659-f1da3fd2d85b?auto=format&fit=crop&w=300&q=80' },
];

export function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'tiendas' | 'inversiones' | 'cursos'>('tiendas');

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🔍 Explorar</Text>
      </View>

      <View style={s.searchWrap}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput style={s.searchInput} placeholder="Buscar en [SV]Go..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
      </View>

      <View style={s.tabRow}>
        {(['tiendas', 'inversiones', 'cursos'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t === 'tiendas' ? '🏪 Tiendas' : t === 'inversiones' ? '📈 Inversiones' : '📚 Cursos'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}>
        {tab === 'tiendas' && (
          <View style={s.grid}>
            {CATS.map(c => (
              <TouchableOpacity key={c.id} style={[s.catCard, { backgroundColor: c.color, borderColor: c.border }]}>
                <Text style={s.catIcon}>{c.icon}</Text>
                <Text style={s.catName}>{c.name}</Text>
                <Text style={s.catCount}>{c.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'inversiones' && (
          <View style={{ marginTop: 16, gap: 16 }}>
            <Text style={s.sectionTitle}>💼 Proyectos Comunitarios</Text>
            {PROJECTS.map(p => (
              <TouchableOpacity key={p.id} style={s.projectCard}>
                <Image source={{ uri: p.image }} style={s.projectImg} />
                <View style={s.projectInfo}>
                  <Text style={s.projectName}>{p.name}</Text>
                  <Text style={s.projectAuthor}>por {p.author}</Text>
                  <View style={s.progressBar}>
                    <View style={[s.progressFill, { width: `${p.pct}%` }]} />
                  </View>
                  <View style={s.projectMeta}>
                    <Text style={s.projectRaised}>{p.raised} recaudado</Text>
                    <Text style={s.projectPct}>{p.pct}%</Text>
                  </View>
                  <View style={s.projectFooter}>
                    <View style={s.returnBadge}><Text style={s.returnTxt}>↗ {p.return}</Text></View>
                    <TouchableOpacity style={s.investBtn}><Text style={s.investTxt}>Invertir</Text></TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'cursos' && (
          <View style={{ marginTop: 16, gap: 12 }}>
            <Text style={s.sectionTitle}>📚 Capacitación para Emprendedores</Text>
            {[
              { id: 1, title: 'Marketing Digital Básico', lessons: 12, duration: '4h 30min', icon: '📱', color: '#dbeafe' },
              { id: 2, title: 'Finanzas para tu Negocio', lessons: 8, duration: '3h 15min', icon: '💰', color: '#dcfce7' },
              { id: 3, title: 'Ventas y Atención al Cliente', lessons: 10, duration: '5h', icon: '🤝', color: '#fef3c7' },
              { id: 4, title: 'Inventarios y Logística', lessons: 6, duration: '2h 45min', icon: '📦', color: '#ede9fe' },
            ].map(c => (
              <TouchableOpacity key={c.id} style={[s.courseCard, { backgroundColor: c.color }]}>
                <Text style={s.courseIcon}>{c.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.courseTitle}>{c.title}</Text>
                  <Text style={s.courseMeta}>{c.lessons} lecciones • {c.duration}</Text>
                </View>
                <TouchableOpacity style={s.startBtn}><Text style={s.startTxt}>Iniciar →</Text></TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  tabActive: { backgroundColor: '#059669' },
  tabTxt: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  tabTxtActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  catCard: { width: (W - 44) / 2, borderRadius: 20, padding: 16, borderWidth: 1.5, alignItems: 'flex-start' },
  catIcon: { fontSize: 32, marginBottom: 8 },
  catName: { fontSize: 14, fontWeight: '900', color: '#111' },
  catCount: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111', marginBottom: 4 },
  projectCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  projectImg: { width: '100%', height: 120 },
  projectInfo: { padding: 14 },
  projectName: { fontSize: 15, fontWeight: '900', color: '#111' },
  projectAuthor: { fontSize: 12, color: '#9ca3af', marginTop: 2, marginBottom: 10 },
  progressBar: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#059669', borderRadius: 999 },
  projectMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  projectRaised: { fontSize: 12, color: '#059669', fontWeight: '700' },
  projectPct: { fontSize: 12, fontWeight: '900', color: '#111' },
  projectFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  returnBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  returnTxt: { color: '#059669', fontSize: 12, fontWeight: '700' },
  investBtn: { backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 },
  investTxt: { color: '#fff', fontSize: 13, fontWeight: '900' },
  courseCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12 },
  courseIcon: { fontSize: 32 },
  courseTitle: { fontSize: 14, fontWeight: '800', color: '#111' },
  courseMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  startBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  startTxt: { fontSize: 12, fontWeight: '800', color: '#059669' },
});
