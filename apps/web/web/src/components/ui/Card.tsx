import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  level?: 1 | 2;
  interactive?: boolean;
  padding?: string;
}

export function Card({ children, level = 1, interactive, padding = "16px", style, ...rest }: Props) {
  return (
    <div
      style={{
        background: level === 1 ? "var(--surface-1)" : "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding,
        cursor: interactive ? "pointer" : undefined,
        transition: "transform var(--dur-base) var(--ease-out), border-color var(--dur-base), box-shadow var(--dur-base)",
        ...style,
      }}
      onMouseEnter={
        interactive
          ? (e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
            }
          : undefined
      }
      onMouseLeave={
        interactive
          ? (e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </div>
  );
}
