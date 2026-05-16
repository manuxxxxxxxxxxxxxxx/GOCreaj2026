// src/screens/Reels/index.tsx
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReelItem } from './ReelItemComponent';
import { REELS } from './ReelsData';
import { s } from './styles';

const { height: H } = Dimensions.get('window');

export function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const likeAnim = useRef(new Animated.Value(1)).current;

  const REEL_HEIGHT = H - insets.bottom - 60;

  const toggleLike = (id: number) => {
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setLiked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  return (
    <View style={s.root}>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={s.topTitle}>⚡ [SV]Go Reels</Text>
      </View>

      <FlatList
        data={REELS}
        renderItem={({ item }) => (
          <ReelItem
            item={item}
            height={REEL_HEIGHT}
            insets={insets}
            liked={liked.includes(item.id)}
            saved={saved.includes(item.id)}
            likeAnim={likeAnim}
            onLike={toggleLike}
            onSave={(id) => setSaved(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
          />
        )}
        keyExtractor={i => String(i.id)}
        pagingEnabled
        snapToInterval={REEL_HEIGHT}
        decelerationRate="fast"
      />
    </View>
  );
}