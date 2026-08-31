import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart } from "@phosphor-icons/react";
import { onFly } from "../../lib/cartFly";

interface Flight {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

let nextId = 0;

/** Renders the flying cart icon triggered by lib/cartFly's triggerFly().
 * Mount once near the layout root -- it's invisible until triggered. */
export function CartFlyOverlay() {
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    return onFly((origin, target) => {
      setFlights((f) => [
        ...f,
        {
          id: nextId++,
          fromX: origin.left + origin.width / 2,
          fromY: origin.top + origin.height / 2,
          toX: target.left + target.width / 2,
          toY: target.top + target.height / 2,
        },
      ]);
    });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000 }} aria-hidden="true">
      <AnimatePresence>
        {flights.map((f) => (
          <motion.div
            key={f.id}
            initial={{ x: f.fromX - 14, y: f.fromY - 14, opacity: 1, scale: 1 }}
            animate={{ x: f.toX - 14, y: f.toY - 14, opacity: 0, scale: 0.35 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            onAnimationComplete={() => setFlights((cur) => cur.filter((x) => x.id !== f.id))}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--cyan)",
              color: "var(--cyan-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--glow-cyan-md)",
            }}
          >
            <ShoppingCart size={15} weight="fill" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
