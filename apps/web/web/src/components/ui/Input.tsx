import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, icon, id, type, style, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
        {label}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && (
          <span style={{ position: "absolute", left: 12, display: "flex", color: "var(--text-muted)", pointerEvents: "none" }}>{icon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          style={{
            width: "100%",
            height: 44,
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
            background: "var(--surface-1)",
            color: "var(--text-primary)",
            padding: `0 ${isPassword ? 40 : 14}px 0 ${icon ? 38 : 14}px`,
            fontSize: 15,
            transition: "border-color var(--dur-base)",
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--cyan)";
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "var(--danger)" : "var(--border)";
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((s) => !s)}
            style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
          >
            {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error ? (
        <span id={`${inputId}-error`} role="alert" style={{ fontSize: 12.5, color: "var(--danger)" }}>
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
});
