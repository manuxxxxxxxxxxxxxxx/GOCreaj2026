import { useRef } from "react";
import { Bell, BellSlash, Camera, ChatCircleText, CreditCard, Flag, Money, PaypalLogo, PencilSimple, SealCheck, Star, Storefront, UsersThree } from "@phosphor-icons/react";
import type { Tienda } from "../../../lib/types";
import { Button } from "../../ui/Button";
import { BrandMosaic } from "../../ui/BrandMosaic";
import { CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../../../lib/categoryIcons";

const METODOS_PAGO: { key: string; label: string; icon: typeof Money }[] = [
  { key: "efectivo", label: "Efectivo", icon: Money },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { key: "paypal", label: "PayPal", icon: PaypalLogo },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

interface Props {
  tienda: Tienda;
  isOwner: boolean;
  notifOn: boolean;
  onPortadaChange?: (file: File) => void;
  subiendoPortada?: boolean;
  onLogoChange?: (file: File) => void;
  subiendoLogo?: boolean;
  onEditarProductos?: () => void;
  onToggleSeguir: () => void;
  onToggleNotif: () => void;
  onContactar: () => void;
  onReportar?: () => void;
}

/**
 * Hero tipo "perfil": el logo va como un sello centrado sobre la portada, y la
 * identidad (nombre, stats, categorías, acciones) queda debajo -- todo apilado
 * y centrado, como una tarjeta de perfil en vez de un banner ancho tipo web clásico.
 */
export function StoreHero({
  tienda,
  isOwner,
  notifOn,
  onPortadaChange,
  subiendoPortada,
  onLogoChange,
  subiendoLogo,
  onEditarProductos,
  onToggleSeguir,
  onToggleNotif,
  onContactar,
  onReportar,
}: Props) {
  const categorias = (tienda.categoria ?? "").split(",").filter(Boolean) as Categoria[];
  const metodosPago = (tienda.metodos_pago ?? "").split(",").filter(Boolean);
  const portadaInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="store-hero">
      <div className="store-hero-banner" style={{ position: "relative", overflow: "hidden", background: tienda.portada ? "var(--surface-2)" : undefined }}>
        {tienda.portada ? (
          <img src={tienda.portada} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }} />
        ) : (
          <BrandMosaic seed={tienda.id} />
        )}
        {/* Oscurece un poco toda la portada -- así el logo centrado y el botón de
            editar quedan legibles sobre cualquier foto, no solo sobre los bordes */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(8,11,20,0.22)" }} />
        {isOwner && onPortadaChange && (
          <>
            <input
              ref={portadaInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPortadaChange(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => portadaInputRef.current?.click()}
              disabled={subiendoPortada}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 11px",
                borderRadius: "var(--radius-pill)",
                background: "rgba(8,11,20,0.5)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: subiendoPortada ? "default" : "pointer",
                backdropFilter: "blur(6px)",
                opacity: subiendoPortada ? 0.7 : 1,
              }}
            >
              <Camera size={13} weight="bold" /> {subiendoPortada ? "Subiendo..." : "Cambiar portada"}
            </button>
          </>
        )}
        <div className="store-hero-logo-wrap" style={{ pointerEvents: "none" }}>
          <div style={{ position: "relative", pointerEvents: "auto" }}>
            <div className="store-hero-logo">
              {tienda.logo ? (
                <img src={tienda.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "var(--surface-2)", color: "var(--text-muted)" }}>
                  <Storefront size={28} />
                </div>
              )}
            </div>
            {isOwner && onLogoChange && (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onLogoChange(file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={subiendoLogo}
                  aria-label="Cambiar foto de perfil"
                  title="Cambiar foto de perfil"
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--cyan)",
                    color: "var(--cyan-ink)",
                    border: "2px solid var(--surface-1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: subiendoLogo ? "default" : "pointer",
                    opacity: subiendoLogo ? 0.7 : 1,
                  }}
                >
                  <Camera size={11} weight="bold" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="store-hero-identity" style={{ background: "var(--surface-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <h1 className="store-hero-name" style={{ fontWeight: 700 }}>{tienda.nombre}</h1>
          {!!tienda.verificado && (
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--cyan-bg)", color: "var(--cyan)", fontSize: 10.5, fontWeight: 800 }}
            >
              <SealCheck size={12} weight="fill" /> VERIFICADO
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3, flexWrap: "wrap" }}>
          <Star size={13} weight="fill" color="var(--warn)" />
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo"}</span>
          <span>({formatCount(tienda.total_resenas)} reseñas)</span>
          <span aria-hidden="true">·</span>
          <UsersThree size={13} />
          <span>{formatCount(tienda.seguidores_count ?? 0)} seguidores</span>
        </div>
        {!!categorias.length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" }}>
            {categorias.slice(0, 5).map((c) => {
              const color = categoriaColor(c);
              const CatIcon = categoriaIcon(c);
              return (
                <span
                  key={c}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: "var(--radius-pill)",
                    background: `color-mix(in srgb, ${color} 16%, transparent)`,
                    color,
                  }}
                >
                  <CatIcon size={11} weight="fill" /> {CATEGORIA_LABEL[c] ?? c}
                </span>
              );
            })}
            {categorias.length > 5 && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", alignSelf: "center" }}>+{categorias.length - 5}</span>}
          </div>
        )}

        {/* Un vendedor no se sigue ni se contacta a sí mismo -- estos botones solo tienen
            sentido para un visitante distinto al dueño de la tienda. En su lugar, desde
            su propia vista previa puede saltar directo a editar el catálogo. */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {isOwner && onEditarProductos && (
            <Button size="sm" variant="primary" onClick={onEditarProductos}>
              <PencilSimple size={14} weight="bold" /> EDITAR PRODUCTOS
            </Button>
          )}
          {!isOwner && (
            <Button size="sm" variant={tienda.yo_sigo ? "secondary" : "primary"} onClick={onToggleSeguir}>
              {tienda.yo_sigo ? (
                "Siguiendo"
              ) : (
                <>
                  <Bell size={14} weight="fill" /> SEGUIR
                </>
              )}
            </Button>
          )}
          {!isOwner && (
            <Button size="sm" variant="secondary" onClick={onContactar}>
              <ChatCircleText size={14} /> CONTACTAR
            </Button>
          )}
          {!isOwner && !!tienda.yo_sigo && (
            <button
              onClick={onToggleNotif}
              aria-label={notifOn ? "Desactivar notificaciones de esta tienda" : "Activar notificaciones de esta tienda"}
              aria-pressed={notifOn}
              title={notifOn ? "Notificaciones activadas" : "Notificaciones desactivadas"}
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${notifOn ? "var(--cyan)" : "var(--border)"}`,
                background: notifOn ? "var(--cyan-bg)" : "var(--surface-2)",
                color: notifOn ? "var(--cyan)" : "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {notifOn ? <Bell size={15} weight="fill" /> : <BellSlash size={15} />}
            </button>
          )}
          {!isOwner && onReportar && (
            <button
              onClick={onReportar}
              aria-label="Reportar tienda"
              title="Reportar tienda"
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Flag size={14} />
            </button>
          )}
        </div>

        {!!metodosPago.length && (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {METODOS_PAGO.filter((m) => metodosPago.includes(m.key)).map(({ key, icon: MetodoIcon, label }) => (
              <span
                key={key}
                title={label}
                aria-label={label}
                style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--cyan-bg)", color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <MetodoIcon size={15} weight="fill" />
              </span>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .store-hero-banner { height: 140px; }
        .store-hero-logo-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .store-hero-logo {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 4px solid rgba(255,255,255,0.92);
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 12px 30px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3);
        }
        .store-hero-identity {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 2px;
          padding: 16px 20px 20px;
        }
        .store-hero-name { font-size: 20px; }
        @media (min-width: 640px) {
          .store-hero-banner { height: 170px; }
          .store-hero-logo { width: 88px; height: 88px; }
          .store-hero-name { font-size: 23px; }
        }
        @media (min-width: 1024px) {
          .store-hero-banner { height: 190px; }
        }
      `}</style>
    </div>
  );
}
