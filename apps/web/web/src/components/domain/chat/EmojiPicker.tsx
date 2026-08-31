import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const GRUPOS: { titulo: string; emojis: string[] }[] = [
  { titulo: "Frecuentes", emojis: ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"] },
  { titulo: "Caras", emojis: ["😀", "😁", "😊", "😍", "🤔", "😅", "😴", "😎", "🥳", "😭", "😡", "😱"] },
  { titulo: "Gestos", emojis: ["👋", "🙌", "👏", "🤝", "✌️", "🤞", "👌", "💪"] },
  { titulo: "Otros", emojis: ["✅", "⭐", "💯", "⏰", "📦", "🛒", "💰", "🚚"] },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement?: "top" | "bottom";
}

/** Selector de emoji propio (sin dependencias externas) para el compositor y las reacciones a mensajes. */
export function EmojiPicker({ onSelect, onClose, anchorRef, placement = "top" }: Props) {
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorRef]);

  const anchorRect = anchorRef.current?.getBoundingClientRect();
  if (!anchorRect) return null;

  const top = placement === "top" ? anchorRect.top - 8 : anchorRect.bottom + 8;

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      aria-label="Selector de emoji"
      style={{
        position: "fixed",
        left: Math.min(anchorRect.left, window.innerWidth - 280),
        top,
        transform: placement === "top" ? "translateY(-100%)" : undefined,
        width: 264,
        maxHeight: 260,
        overflowY: "auto",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
        padding: 10,
        zIndex: "var(--z-sheet)" as unknown as number,
        animation: "rise var(--dur-fast) var(--ease-out) both",
      }}
    >
      {GRUPOS.map((g) => (
        <div key={g.titulo} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>{g.titulo}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2 }}>
            {g.emojis.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onSelect(e);
                  onClose();
                }}
                aria-label={e}
                style={{ width: 28, height: 28, fontSize: 18, background: "none", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                className="emoji-picker-btn"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
