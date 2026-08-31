/** Coordinates the "fly to cart" effect: a product's add button registers a
 * fly, CartFlyOverlay (mounted once near the layout root) animates a dot
 * from the button to the cart icon in TopNav. Plain pub-sub, no React state
 * needed for the target registration itself. */
let cartTargetEl: HTMLElement | null = null;

type FlyListener = (origin: DOMRect, target: DOMRect) => void;
const listeners = new Set<FlyListener>();

export function registerCartTarget(el: HTMLElement | null) {
  cartTargetEl = el;
}

export function onFly(cb: FlyListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function triggerFly(originEl: HTMLElement) {
  if (!cartTargetEl) return;
  const origin = originEl.getBoundingClientRect();
  const target = cartTargetEl.getBoundingClientRect();
  listeners.forEach((l) => l(origin, target));
}
