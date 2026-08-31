import { useCallback, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { CaretLeftIcon, CaretRightIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";

interface CarouselProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  itemWidth: number;
  gap?: number;
  loop?: boolean;
  arrows?: boolean;
  itemsPerPress?: number;
  contentPaddingHorizontal?: number;
}

/**
 * Carrusel horizontal con flechas laterales y scroll infinito (los datos se triplican
 * y el offset se re-centra en silencio al acercarse a un extremo, truco clásico de
 * "infinite carousel" para no depender de listas realmente circulares).
 */
export function Carousel<T>({
  data,
  renderItem,
  keyExtractor,
  itemWidth,
  gap = 12,
  loop = true,
  arrows = true,
  itemsPerPress = 3,
  contentPaddingHorizontal = 0,
}: CarouselProps<T>) {
  const { tokens } = useTheme();
  const listRef = useRef<FlatList<T>>(null);
  const offsetRef = useRef(0);
  const step = itemWidth + gap;
  const canLoop = loop && data.length > 2;
  const loopData = useMemo(() => (canLoop ? [...data, ...data, ...data] : data), [canLoop, data]);

  const scrollToOffset = (offset: number, animated: boolean) => {
    const clamped = Math.max(0, offset);
    listRef.current?.scrollToOffset({ offset: clamped, animated });
    offsetRef.current = clamped;
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.x;
  };

  const onMomentumScrollEnd = () => {
    if (!canLoop) return;
    const total = data.length * step;
    const x = offsetRef.current;
    if (x < total * 0.5) scrollToOffset(x + total, false);
    else if (x > total * 1.5) scrollToOffset(x - total, false);
  };

  const goPrev = () => scrollToOffset(offsetRef.current - step * itemsPerPress, true);
  const goNext = () => scrollToOffset(offsetRef.current + step * itemsPerPress, true);

  const renderRow = useCallback(
    ({ item, index }: ListRenderItemInfo<T>) => <View style={{ width: itemWidth, marginRight: gap }}>{renderItem(item, index % data.length)}</View>,
    [renderItem, itemWidth, gap, data.length],
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={loopData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${keyExtractor(item, index % Math.max(1, data.length))}-${index}`}
        renderItem={renderRow}
        contentContainerStyle={{ paddingHorizontal: contentPaddingHorizontal, paddingVertical: 4 }}
        getItemLayout={(_, index) => ({ length: step, offset: step * index, index })}
        initialScrollIndex={canLoop ? data.length : 0}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      />
      {arrows && data.length > 1 && (
        <>
          <Pressable onPress={goPrev} hitSlop={8} style={[styles.arrow, styles.arrowLeft, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
            <CaretLeftIcon size={14} weight="bold" color={tokens.textPrimary} />
          </Pressable>
          <Pressable onPress={goNext} hitSlop={8} style={[styles.arrow, styles.arrowRight, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
            <CaretRightIcon size={14} weight="bold" color={tokens.textPrimary} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  arrowLeft: { left: -6 },
  arrowRight: { right: -6 },
});
