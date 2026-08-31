import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle, WarningCircle, XCircle, Info, X, type Icon } from "@phosphor-icons/react";

type ToastKind = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, Icon> = {
  success: CheckCircle,
  error: XCircle,
  warning: WarningCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 24,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: "var(--z-toast)" as unknown as number,
          width: "min(380px, calc(100vw - 32px))",
        }}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          const tone =
            t.kind === "success" ? "var(--ok)" : t.kind === "error" ? "var(--danger)" : t.kind === "warning" ? "var(--warn)" : "var(--cyan)";
          return (
            <div
              key={t.id}
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                padding: "12px 14px",
                animation: "toast-in 220ms var(--ease-out) both",
              }}
            >
              <Icon size={20} weight="bold" color={tone as unknown as string} />
              <span style={{ fontSize: 14, color: "var(--text-primary)", flex: 1 }}>{t.message}</span>
              <button
                aria-label="Cerrar notificación"
                onClick={() => dismiss(t.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
