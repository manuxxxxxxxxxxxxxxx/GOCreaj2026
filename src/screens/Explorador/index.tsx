// src/screens/Explorador/index.tsx
import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATS, COURSES, PROJECTS } from './ExploreData';
import { s } from './styles';

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
        <TextInput
          style={s.searchInput}
          placeholder="Buscar en [SV]Go..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={s.tabRow}>
        {(['tiendas', 'inversiones', 'cursos'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
              {t === 'tiendas' ? '🏪 Tiendas' : t === 'inversiones' ? '📈 Inversiones' : '📚 Cursos'}
            </Text>
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
            {COURSES.map(c => (
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