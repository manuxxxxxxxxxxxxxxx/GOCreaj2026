import { View } from "react-native";
import type { Producto } from "../../lib/types";
import { ProductCard } from "./ProductCard";
import { AnimatedListItem } from "../ui/Motion";

export function BentoGrid({ productos }: { productos: Producto[] }) {
  if (productos.length === 0) return null;
  const [first, ...rest] = productos;
  const pairs: Producto[][] = [];
  for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2));

  return (
    <View style={{ gap: 12 }}>
      <AnimatedListItem index={0}>
        <ProductCard producto={first} height={200} />
      </AnimatedListItem>
      {pairs.map((pair, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          {pair.map((p, j) => (
            <AnimatedListItem key={p.id} index={i * 2 + j + 1} style={{ flex: 1 }}>
              <ProductCard producto={p} height={140} />
            </AnimatedListItem>
          ))}
          {pair.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}
