import { Link } from "react-router-dom";
import {
  Compass,
  FacebookLogo,
  Heart,
  InstagramLogo,
  MapPin,
  Package,
  ShieldCheck,
  Storefront,
  TiktokLogo,
  WhatsappLogo,
  type Icon,
} from "@phosphor-icons/react";
import { useToast } from "../../context/ToastContext";

interface FooterLink {
  label: string;
  to: string;
  icon: Icon;
}

const COMPRAR: FooterLink[] = [
  { label: "Explorar tiendas", to: "/explorar", icon: Compass },
  { label: "Mis pedidos", to: "/pedidos", icon: Package },
  { label: "Mis direcciones", to: "/direcciones", icon: MapPin },
];

const VENDER: FooterLink[] = [
  { label: "Conviértete en vendedor", to: "/convertirse", icon: Storefront },
  { label: "Centro de ayuda", to: "/soporte", icon: ShieldCheck },
];

const SOCIAL: { icon: Icon; label: string }[] = [
  { icon: FacebookLogo, label: "Facebook" },
  { icon: InstagramLogo, label: "Instagram" },
  { icon: TiktokLogo, label: "TikTok" },
  { icon: WhatsappLogo, label: "WhatsApp" },
];

export function Footer() {
  const toast = useToast();
  const proximamente = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.show("Muy pronto disponible 🚀", "info");
  };

  return (
    <footer
      className="glow-mesh"
      style={{
        marginTop: 48,
        borderTop: "1px solid var(--border)",
        background: "var(--surface-1)",
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px 28px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between" }}>
          <div style={{ maxWidth: 260 }}>
            <Link to="/" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21 }}>
              SV<span style={{ color: "var(--cyan)" }}>[Go]</span>
            </Link>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>
              Tu marketplace local: comida, mercado, farmacia, moda y envíos, de puerta en puerta por todo El Salvador.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {SOCIAL.map(({ icon: SocialIcon, label }) => (
                <a
                  key={label}
                  href="#"
                  onClick={proximamente}
                  aria-label={label}
                  className="footer-social-btn"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  <SocialIcon size={16} weight="fill" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Comprar" links={COMPRAR} />
          <FooterColumn title="Vender" links={VENDER} />
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
            <span>© 2026 SV[Go] · Hecho con</span>
            <Heart size={12} weight="fill" color="var(--coral)" />
            <span>en El Salvador</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: "var(--radius-pill)", background: "var(--ok-bg)" }}>
            <ShieldCheck size={13} weight="fill" color="var(--ok)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ok-ink)" }}>Pagos seguros</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div style={{ minWidth: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map((l) => (
          <Link key={l.label} to={l.to} className="footer-link" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
            <l.icon size={14} />
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
