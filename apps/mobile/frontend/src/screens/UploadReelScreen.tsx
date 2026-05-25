import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { api, uploadReel, Endpoints } from '@/services/api';
import { RootStackParamList } from '@/types';

interface Producto { id: number; nombre: string; precio: number; imagen?: string | null; }

export default function UploadReelScreen() {
  const nav    = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [archivo, setArchivo]       = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [titulo, setTitulo]         = useState('');
  const [descripcion, setDesc]      = useState('');
  const [productoId, setProductoId] = useState<number | null>(null);
  const [productos, setProductos]   = useState<Producto[]>([]);
  const [uploading, setUploading]   = useState(false);
  const [showProds, setShowProds]   = useState(false);

  const player = useVideoPlayer(null, p => { p.loop = true; p.muted = false; });

  useEffect(() => {
    if (archivo?.type === 'video' && archivo.uri) {
      player.replace(archivo.uri);
      player.pause();
    }
  }, [archivo]);

  useFocusEffect(useCallback(() => {
    api<{ ok: boolean; productos?: Producto[] }>(Endpoints.vendedorProductos)
      .then(r => { if (r.ok) setProductos(r.productos ?? []); })
      .catch(() => {});
  }, []));

  const pedirPermisoCamara = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara para grabar.');
      return false;
    }
    return true;
  };

  const pedirPermisoGaleria = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return false;
    }
    return true;
  };

  const elegirGaleriaVideo = async () => {
    if (!(await pedirPermisoGaleria())) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) setArchivo(res.assets[0]);
  };

  const elegirGaleriaImagen = async () => {
    if (!(await pedirPermisoGaleria())) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setArchivo(res.assets[0]);
  };

  const grabarVideo = async () => {
    if (!(await pedirPermisoCamara())) return;
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos',
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) setArchivo(res.assets[0]);
  };

  const tomarFoto = async () => {
    if (!(await pedirPermisoCamara())) return;
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setArchivo(res.assets[0]);
  };

  const publicar = async () => {
    if (!archivo) { Alert.alert('Selecciona un archivo', 'Elige un video o imagen primero.'); return; }
    setUploading(true);
    try {
      const mime = archivo.mimeType ?? (archivo.type === 'video' ? 'video/mp4' : 'image/jpeg');
      const ext  = archivo.fileName?.split('.').pop() ?? (archivo.type === 'video' ? 'mp4' : 'jpg');
      const name = `reel_${Date.now()}.${ext}`;

      const res = await uploadReel(
        { uri: archivo.uri, type: mime, name },
        { titulo: titulo.trim() || undefined, descripcion: descripcion.trim() || undefined, producto_id: productoId ?? undefined }
      );

      if (res.ok) {
        Alert.alert('¡Publicado!', 'Tu reel fue publicado exitosamente.', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.error ?? 'No se pudo publicar el reel.');
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const prodSeleccionado = productos.find(p => p.id === productoId);
  const isVideo = archivo?.type === 'video';

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={S.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.text }]}>Nuevo Reel</Text>
        <TouchableOpacity
          style={[S.pubBtn, { backgroundColor: archivo ? colors.accent : colors.border }]}
          onPress={publicar}
          disabled={!archivo || uploading}
        >
          {uploading
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={S.pubTxt}>Publicar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">

        {/* Preview */}
        {archivo ? (
          <View style={S.previewWrap}>
            {isVideo ? (
              <VideoView
                player={player}
                style={S.preview}
                contentFit="cover"
                nativeControls
                allowsFullscreen={false}
              />
            ) : (
              <Image source={{ uri: archivo.uri }} style={S.preview} resizeMode="cover" />
            )}
            <TouchableOpacity style={S.changeBtn} onPress={() => setArchivo(null)}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={S.changeTxt}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[S.pickArea, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="cloud-upload-outline" size={48} color={colors.muted} />
            <Text style={[S.pickTitle, { color: colors.text }]}>Selecciona tu contenido</Text>
            <Text style={[S.pickSub, { color: colors.muted }]}>Video máximo 60 seg · Foto 9:16</Text>
          </View>
        )}

        {/* Picker buttons */}
        <View style={S.btnsGrid}>
          <TouchableOpacity style={[S.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={grabarVideo}>
            <Ionicons name="videocam" size={24} color={colors.accent} />
            <Text style={[S.pickBtnTxt, { color: colors.text }]}>Grabar</Text>
            <Text style={[S.pickBtnSub, { color: colors.muted }]}>video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={tomarFoto}>
            <Ionicons name="camera" size={24} color={colors.accent} />
            <Text style={[S.pickBtnTxt, { color: colors.text }]}>Tomar</Text>
            <Text style={[S.pickBtnSub, { color: colors.muted }]}>foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={elegirGaleriaVideo}>
            <Ionicons name="film-outline" size={24} color="#A855F7" />
            <Text style={[S.pickBtnTxt, { color: colors.text }]}>Galería</Text>
            <Text style={[S.pickBtnSub, { color: colors.muted }]}>video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={elegirGaleriaImagen}>
            <Ionicons name="image-outline" size={24} color="#10B981" />
            <Text style={[S.pickBtnTxt, { color: colors.text }]}>Galería</Text>
            <Text style={[S.pickBtnSub, { color: colors.muted }]}>foto</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={[S.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[S.label, { color: colors.muted }]}>TÍTULO (opcional)</Text>
          <TextInput
            style={[S.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder="Ej: Pupusas de queso fresquitas 🔥"
            placeholderTextColor={colors.muted}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={80}
          />

          <Text style={[S.label, { color: colors.muted, marginTop: 16 }]}>DESCRIPCIÓN (opcional)</Text>
          <TextInput
            style={[S.inputMulti, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder="Cuéntale a tus clientes sobre este producto..."
            placeholderTextColor={colors.muted}
            value={descripcion}
            onChangeText={setDesc}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />

          <Text style={[S.label, { color: colors.muted, marginTop: 16 }]}>VINCULAR A PRODUCTO (opcional)</Text>
          <TouchableOpacity
            style={[S.prodPicker, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowProds(v => !v)}
          >
            {prodSeleccionado ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Ionicons name="bag" size={16} color={colors.accent} />
                <Text style={[{ color: colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                  {prodSeleccionado.nombre}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>${Number(prodSeleccionado.precio).toFixed(2)}</Text>
              </View>
            ) : (
              <Text style={{ color: colors.muted, flex: 1 }}>Sin producto vinculado</Text>
            )}
            <Ionicons name={showProds ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
          </TouchableOpacity>

          {showProds && (
            <View style={[S.prodList, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[S.prodItem, productoId === null && S.prodItemActive]}
                onPress={() => { setProductoId(null); setShowProds(false); }}
              >
                <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
                <Text style={[S.prodItemTxt, { color: colors.muted }]}>Sin vincular</Text>
              </TouchableOpacity>
              {productos.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[S.prodItem, productoId === p.id && { backgroundColor: `${colors.accent}22` }]}
                  onPress={() => { setProductoId(p.id); setShowProds(false); }}
                >
                  <Ionicons name="bag-outline" size={16} color={colors.accent} />
                  <Text style={[S.prodItemTxt, { color: colors.text, flex: 1 }]} numberOfLines={1}>{p.nombre}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>${Number(p.precio).toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={[S.tips, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}40` }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[S.tipTitle, { color: colors.accent }]}>Consejos para mejores reels</Text>
            <Text style={[S.tipTxt, { color: colors.muted }]}>
              • Video vertical (9:16) para mejor visualización{'\n'}
              • Máximo 60 segundos de video{'\n'}
              • Buena iluminación y audio claro{'\n'}
              • Vincula tu producto para más ventas
            </Text>
          </View>
        </View>

        {/* Publish button (bottom) */}
        <TouchableOpacity
          style={[S.pubBtnBottom, { backgroundColor: archivo ? colors.accent : colors.border }]}
          onPress={publicar}
          disabled={!archivo || uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={S.pubBtnTxt}>Subiendo...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#FFF" />
              <Text style={S.pubBtnTxt}>Publicar Reel</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn:     { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  pubBtn:      { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  pubTxt:      { color: '#FFF', fontWeight: '800', fontSize: 14 },

  previewWrap: { margin: 16, borderRadius: 16, overflow: 'hidden', aspectRatio: 9 / 16, position: 'relative' },
  preview:     { width: '100%', height: '100%' },
  changeBtn: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },
  changeTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  pickArea: {
    margin: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 40,
  },
  pickTitle: { fontSize: 16, fontWeight: '700' },
  pickSub:   { fontSize: 12 },

  btnsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginHorizontal: 16, marginBottom: 16,
  },
  pickBtn: {
    flex: 1, minWidth: '45%', alignItems: 'center', gap: 4,
    paddingVertical: 16, borderRadius: 14, borderWidth: 1,
  },
  pickBtnTxt: { fontSize: 13, fontWeight: '700' },
  pickBtnSub: { fontSize: 11 },

  form: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  label:      { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  input: {
    borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontWeight: '500',
  },
  inputMulti: {
    borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontWeight: '500', minHeight: 80,
  },
  prodPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12,
  },
  prodList: {
    borderRadius: 10, borderWidth: 1.5, marginTop: 8, overflow: 'hidden',
  },
  prodItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  prodItemActive: { backgroundColor: 'rgba(79,110,247,0.12)' },
  prodItemTxt: { fontSize: 14, fontWeight: '600' },

  tips: {
    flexDirection: 'row', gap: 10, marginHorizontal: 16, borderRadius: 14, borderWidth: 1,
    padding: 14, marginBottom: 16,
  },
  tipTitle: { fontWeight: '800', fontSize: 13, marginBottom: 6 },
  tipTxt:   { fontSize: 12, lineHeight: 18 },

  pubBtnBottom: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    marginHorizontal: 16, paddingVertical: 16, borderRadius: 16,
  },
  pubBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
