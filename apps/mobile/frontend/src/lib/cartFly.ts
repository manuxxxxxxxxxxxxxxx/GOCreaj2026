/**
 * Coordinates the "fly to cart" effect: a product's add button registers a
 * fly, CartFlyOverlay (mounted once in TabsShell) animates a dot from the
 * button to the cart icon in TopBar. Plain pub-sub with regular JS values --
 * not Reanimated shared values. `makeMutable()` at module scope (outside any
 * component) can crash on real-device cold start if Reanimated's native
 * runtime isn't fully installed yet when this module first evaluates; a
 * plain listener set has no such dependency and mirrors the web version of
 * this same file, which is already verified working.
 */
type Point = { x: number; y: number };
type FlyListener = (origin: Point, target: Point) => void;

let cartTargetPos: Point | null = null;
const listeners = new Set<FlyListener>();

export function setCartTarget(x: number, y: number) {
  cartTargetPos = { x, y };
}

export function onFly(cb: FlyListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function triggerFly(x: number, y: number) {
  if (!cartTargetPos) return;
  const origin = { x, y };
  const target = cartTargetPos;
  listeners.forEach((l) => l(origin, target));
}
