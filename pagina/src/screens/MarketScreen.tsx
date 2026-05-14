import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import ProductCard from '../components/ProductCard';
import Toast from '../components/Toast';
import { useCart } from '../hooks/useCart';
import { getProducts } from '../services/productsService';
import { getCategories, type CategoryItem } from '../services/categoriesService';
import { Colors, Radius, Shadow } from '../theme/colors';
import { CATEGORIES } from '../data/catalog';
import type { Product, ProductCategory } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Market'>;

export default function MarketScreen({ navigation }: Props) {
  const { addItem, count } = useCart();
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([...CATEGORIES] as CategoryItem[]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [category,   setCategory]   = useState<ProductCategory | 'todos'>('todos');
  const [toast,      setToast]      = useState({ visible: false, message: '' });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    load();
  }, [category]);

  async function load() {
    setLoading(true);
    const data = await getProducts(category, search);
    setProducts(data);
    setLoading(false);
  }

  async function handleSearch() {
    setLoading(true);
    const data = await getProducts(category, search);
    setProducts(data);
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast({ visible: true, message: msg });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mercado</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart' as any)}>
          <Text style={{ fontSize: 20 }}>🛒</Text>
          {count > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos o tiendas…"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={handleSearch}>
          <Text style={styles.filterBtnText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(c) => c.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catsContent}
        style={styles.catsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, category === item.key && styles.catChipActive]}
            onPress={() => setCategory(item.key as any)}
          >
            <Text style={styles.catEmoji}>{item.emoji}</Text>
            <Text style={[styles.catLabel, category === item.key && styles.catLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Products */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.blue} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.productsContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No encontramos productos con esos filtros.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <ProductCard
                product={item}
                onAddToCart={(p) => {
                  addItem(p);
                  showToast(`${p.name} agregado al carrito`);
                }}
              />
            </View>
          )}
        />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: '' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn:      { paddingRight: 12 },
  backText:     { fontSize: 16, color: Colors.blue, fontWeight: '600' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: Colors.text },
  cartBtn:      { padding: 6, position: 'relative' },
  cartBadge:    { position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.red, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText:{ color: Colors.white, fontSize: 9, fontWeight: '700' },
  searchRow:    { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchWrap:   { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.inputBg, paddingHorizontal: 12 },
  searchIcon:   { fontSize: 16, marginRight: 6 },
  searchInput:  { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },
  filterBtn:    { backgroundColor: Colors.blue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md, justifyContent: 'center' },
  filterBtnText:{ color: Colors.white, fontSize: 13, fontWeight: '600' },
  catsList:     { maxHeight: 56, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catsContent:  { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  catChipActive:{ backgroundColor: Colors.blue + '18', borderColor: Colors.blue },
  catEmoji:     { fontSize: 14 },
  catLabel:     { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  catLabelActive:{ color: Colors.blue },
  productsContent:{ padding: 12, paddingBottom: 80 },
  row:          { justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  cardWrap:     { flex: 1 },
  empty:        { alignItems: 'center', marginTop: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
