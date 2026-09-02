import { useTheme } from "../../context/ThemeContext";

// Solo tonos cyan/navy de la marca -- nada de morado ni naranja, para que el
// placeholder se sienta parte de SV[Go] y no un degradé genérico.
const GRADIENTS = [
  "linear-gradient(135deg, #04141c 0%, var(--cyan) 100%)",
  "linear-gradient(135deg, var(--cyan) 0%, #04141c 100%)",
  "linear-gradient(160deg, #0b2530 0%, var(--cyan) 55%, #04141c 100%)",
];

/** Branded placeholder for a missing product photo or store banner: a gradient card
 * with the SV[Go] logo tiled faintly across it, instead of a flat empty box.
 * Fills its nearest positioned ancestor (`position: absolute; inset: 0`) -- the parent
 * needs `position: relative` and a defined height. */
export function BrandMosaic({ seed = 0, tileSize = 72 }: { seed?: number; tileSize?: number }) {
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === "dark" ? "/brand/logo-dark.png" : "/brand/logo-light.png";
  const gradient = GRADIENTS[((seed % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length];

  return (
    <div style={{ position: "absolute", inset: 0, background: gradient, overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-40px",
          backgroundImage: `url(${logo})`,
          backgroundSize: `${tileSize}px auto`,
          backgroundRepeat: "repeat",
          opacity: 0.14,
          transform: "rotate(-8deg)",
        }}
      />
    </div>
  );
}
