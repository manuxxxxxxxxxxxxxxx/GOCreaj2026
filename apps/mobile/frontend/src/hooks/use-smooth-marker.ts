import { useEffect, useRef, useState } from "react";

/**
 * Interpola linealmente entre la última posición mostrada y la nueva cada vez que
 * `destino` cambia, en vez de saltar de golpe -- pensado para el marcador del repartidor
 * en CustomerTrackingScreen/SellerOrderModal, que se actualiza por polling REST cada
 * pocos segundos (ver DESIGN.md "Flujo logístico" y pedidos_tracking.php
 * action=actualizar_ubicacion), no por un socket en vivo. `actualRef` guarda la posición
 * real ya animada en cada cuadro -- si llega una posición nueva a la mitad de una
 * animación, la siguiente arranca desde ahí, no desde el destino anterior.
 */
// Cada paso de la animación termina llamando WebMapView.goSetMarkers() a través del
// puente del WebView (ver components/ui/WebMapView.tsx) -- 60fps ahí es puro gasto de
// batería para un punto que se mueve despacio. 12 pasos/seg ya se ve perfectamente
// fluido y son 1/5 de las llamadas al puente.
const INTERVALO_MS = 80;

export function useSmoothMarker(destino: [number, number] | null, duracionMs = 2200): [number, number] | null {
  const [mostrado, setMostrado] = useState<[number, number] | null>(destino);
  const actualRef = useRef<[number, number] | null>(destino);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current);

    if (!destino) {
      actualRef.current = null;
      setMostrado(null);
      return;
    }

    const desde = actualRef.current ?? destino;
    if (desde[0] === destino[0] && desde[1] === destino[1]) {
      actualRef.current = destino;
      setMostrado(destino);
      return;
    }

    const inicio = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - inicio) / duracionMs);
      const ease = 1 - (1 - t) * (1 - t); // ease-out: arranca rápido, llega suave
      const punto: [number, number] = [desde[0] + (destino[0] - desde[0]) * ease, desde[1] + (destino[1] - desde[1]) * ease];
      actualRef.current = punto;
      setMostrado(punto);
      if (t >= 1 && timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    timerRef.current = setInterval(tick, INTERVALO_MS);
    tick();

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino?.[0], destino?.[1], duracionMs]);

  return mostrado;
}
