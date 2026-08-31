import { useLayoutEffect, useRef, type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface CarouselProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  itemWidth: number;
  gap?: number;
  loop?: boolean;
  itemsPerPress?: number;
  ariaLabel?: string;
}

/**
 * Riel horizontal con flechas y scroll infinito: los datos se triplican y el
 * scrollLeft se re-centra sin animación al acercarse a un extremo, así el
 * usuario nunca ve el final de la lista.
 */
export function Carousel<T>({ data, renderItem, keyExtractor, itemWidth, gap = 14, loop = true, itemsPerPress = 3, ariaLabel }: CarouselProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const initedRef = useRef(false);
  const step = itemWidth + gap;
  const canLoop = loop && data.length > 2;
  const loopData = canLoop ? [...data, ...data, ...data] : data;

  useLayoutEffect(() => {
    if (canLoop && scrollerRef.current && !initedRef.current) {
      scrollerRef.current.scrollLeft = data.length * step;
      initedRef.current = true;
    }
  }, [canLoop, data.length, step]);

  if (data.length === 0) return null;

  const onScroll = () => {
    if (!canLoop || !scrollerRef.current) return;
    const el = scrollerRef.current;
    const total = data.length * step;
    if (el.scrollLeft < total * 0.5) el.scrollLeft += total;
    else if (el.scrollLeft > total * 1.5) el.scrollLeft -= total;
  };

  const goPrev = () => scrollerRef.current?.scrollBy({ left: -step * itemsPerPress, behavior: "smooth" });
  const goNext = () => scrollerRef.current?.scrollBy({ left: step * itemsPerPress, behavior: "smooth" });

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role={ariaLabel ? "region" : undefined}
        aria-label={ariaLabel}
        className="carousel-track"
        style={{ display: "flex", gap, overflowX: "auto" }}
      >
        {loopData.map((item, i) => (
          <div key={`${keyExtractor(item, i % data.length)}-${i}`} style={{ flexShrink: 0, width: itemWidth }}>
            {renderItem(item, i % data.length)}
          </div>
        ))}
      </div>
      {data.length > 1 && (
        <>
          <button type="button" aria-label="Anterior" onClick={goPrev} className="carousel-arrow carousel-arrow-left">
            <CaretLeft size={15} weight="bold" />
          </button>
          <button type="button" aria-label="Siguiente" onClick={goNext} className="carousel-arrow carousel-arrow-right">
            <CaretRight size={15} weight="bold" />
          </button>
        </>
      )}
    </div>
  );
}
