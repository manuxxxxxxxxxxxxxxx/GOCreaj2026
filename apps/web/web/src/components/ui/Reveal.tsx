import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

interface Props extends HTMLMotionProps<"div"> {
  /** Position in a list/grid -- staggers the entrance. Capped so long lists
   * don't take forever to finish revealing. */
  index?: number;
  children: React.ReactNode;
}

/** Fade+slide entrance for page sections, cards, and list items. Respects
 * prefers-reduced-motion (skips the transform, keeps opacity only). */
export function Reveal({ index = 0, children, style, ...rest }: Props) {
  const reduced = useReducedMotion();
  const delay = Math.min(index, 9) * 0.045;

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.18 : 0.36, delay, ease: [0.16, 1, 0.3, 1] }}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
