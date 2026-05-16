// src/screens/Reels/ReelItemComponent.tsx
import React from 'react';
import { Animated, Image, Text, TouchableOpacity, View } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';

import { ReelItem as ReelType } from './ReelsData';
import { s } from './styles';

interface Props {
  item: ReelType;
  height: number;
  insets: EdgeInsets;
  liked: boolean;
  saved: boolean;
  likeAnim: Animated.Value;
  onLike: (id: number) => void;
  onSave: (id: number) => void;
}

export function ReelItem({ item, height, insets, liked, saved, likeAnim, onLike, onSave }: Props) {
  return (
    <View style={[s.reel, { height }]}>
      {/* Fondo: imagen o color */}
      {item.image ? (
        <Image source={{ uri: item.image }} style={s.bg} resizeMode="cover" />
      ) : (
        <View style={[s.bg, { backgroundColor: '#1f2937' }]} />
      )}
      <View style={s.overlay} />

      {/* INFO INFERIOR (autor + descripción + producto) */}
      <View style={[s.bottomInfo, { bottom: insets.bottom + 80 }]}>
        <View style={s.authorRow}>
          <Text style={s.authorName}>{(item as any).user || (item as any).author || 'Usuario'}</Text>
          <Text style={s.authorHandle}>{(item as any).handle || ''}</Text>
        </View>

        <Text style={s.desc} numberOfLines={3}>
          {(item as any).caption || (item as any).description || ''}
        </Text>

        {(item as any).music && (
          <Text style={s.music}>🎵 {(item as any).music}</Text>
        )}

        {(item as any).distance && (
          <Text style={s.distance}>📍 {(item as any).distance}</Text>
        )}

        {(item as any).product && (
          <TouchableOpacity style={s.productCard} activeOpacity={0.9}>
            {(item as any).product.image ? (
              <Image source={{ uri: (item as any).product.image }} style={s.productImg} />
            ) : (
              <View style={[s.productImg, { backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 22 }}>🛍️</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.productName} numberOfLines={1}>{(item as any).product.name}</Text>
              <Text style={[s.productPrice, { color: '#10b981' }]}>{(item as any).product.price}</Text>
            </View>
            <TouchableOpacity style={[s.buyBtn, { backgroundColor: '#059669' }]}>
              <Text style={s.buyBtnTxt}>Comprar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </View>

      {/* ACCIONES LATERALES (like, comentario, guardar, compartir) */}
      <View style={[s.actions, { bottom: insets.bottom + 80 }]}>
        {/* Avatar autor con botón follow */}
        <View style={s.avatarWrap}>
          {(item as any).avatar ? (
            <Image source={{ uri: (item as any).avatar }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, { backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: '900' }}>SV</Text>
            </View>
          )}
          <View style={[s.followBtn, { backgroundColor: '#ef4444' }]}>
            <Text style={s.followTxt}>+</Text>
          </View>
        </View>

        {/* Like */}
        <TouchableOpacity style={s.actionBtn} onPress={() => onLike(item.id)} activeOpacity={0.7}>
          <Animated.Text style={[s.actionIcon, { transform: [{ scale: likeAnim }] }]}>
            {liked ? '❤️' : '🤍'}
          </Animated.Text>
          <Text style={s.actionTxt}>{(item as any).likes || 0}</Text>
        </TouchableOpacity>

        {/* Comentarios */}
        <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
          <Text style={s.actionIcon}>💬</Text>
          <Text style={s.actionTxt}>{(item as any).comments || 0}</Text>
        </TouchableOpacity>

        {/* Guardar */}
        <TouchableOpacity style={s.actionBtn} onPress={() => onSave(item.id)} activeOpacity={0.7}>
          <Text style={s.actionIcon}>{saved ? '🔖' : '📑'}</Text>
          <Text style={s.actionTxt}>Guardar</Text>
        </TouchableOpacity>

        {/* Compartir */}
        <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
          <Text style={s.actionIcon}>↗️</Text>
          <Text style={s.actionTxt}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}