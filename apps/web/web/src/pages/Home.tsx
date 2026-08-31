import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Storefront } from "@phosphor-icons/react";
import { productosApi } from "../lib/api";
import type { Producto, Tienda } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useZonaSeleccionada } from "../hooks/useZonaSeleccionada";
import { StoreCard } from "../components/domain/StoreCard";
import { ProductCard } from "../components/domain/ProductCard";
import { ElSalvadorMap } from "../components/domain/ElSalvadorMap";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Carousel } from "../components/ui/Carousel";
import { Reveal } from "../components/ui/Reveal";
import { CATEGORIA_GRUPOS } from "../lib/categoryIcons";
import repartidorImg from "../assets/svgo-repartidor.png";

export function Home() {
  const { usuario } = useAuth();
  const { municipio, elegirZona } = useZonaSeleccionada();
  const [destacadas, setDestacadas] = useState<Tienda[] | null>(null);
  const [nuevas, setNuevas] = useState<Tienda[] | null>(null);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [conteoDepartamentos, setConteoDepartamentos] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    productosApi.tiendasPorDepartamento().then((r) => setConteoDepartamentos(r.conteo)).catch(() => setConteoDepartamentos({}));
  }, []);

  useEffect(() => {
    productosApi
      .tiendasDestacadas({ municipio, limit: 8 })
      .then((r) => (r.tiendas.length === 0 && municipio ? productosApi.tiendasDestacadas({ limit: 8 }).then((r2) => r2.tiendas) : r.tiendas))
      .then(setDestacadas)
      .catch(() => setDestacadas([]));
    productosApi
      .nuevasTiendas({ municipio, limit: 8 })
      .then((r) => (r.tiendas.length === 0 && municipio ? productosApi.nuevasTiendas({ limit: 8 }).then((r2) => r2.tiendas) : r.tiendas))
      .then(setNuevas)
      .catch(() => setNuevas([]));
    productosApi
      .listar({ municipio, page: 1, limit: 16 })
      .then((r) => (r.productos.length === 0 && municipio ? productosApi.listar({ page: 1, limit: 16 }).then((r2) => r2.productos) : r.productos))
      .then(setProductos)
      .catch(() => setProductos([]));
  }, [municipio]);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
      <section className="glow-mesh hero-banner" style={{ position: "relative", borderRadius: "var(--radius-lg)", background: "var(--surface-1)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <Reveal style={{ display: "flex", alignItems: "center", gap: 24, padding: "36px 32px", minHeight: 208 }}>
          <div className="hero-copy" style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 440, flexShrink: 0, position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)" }}>
              {saludo}{usuario ? `, ${usuario.nombre.split(" ")[0]}` : ""}
            </span>
            <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>¿Qué se te antoja pedir hoy?</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Comida, mercado, farmacia, moda y envíos — todo en un mismo lugar, con seguimiento en vivo hasta tu puerta.
            </p>
            <Link
              to="/explorar"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, background: "var(--cyan)", color: "var(--cyan-ink)", width: "fit-content", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13.5 }}
            >
              Explorar tiendas <ArrowRight size={15} weight="bold" />
            </Link>
          </div>
          <div style={{ flex: 1, position: "relative", alignSelf: "stretch", minWidth: 0 }}>
            <img
              src={repartidorImg}
              alt=""
              aria-hidden="true"
              className="hero-character"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                height: 340,
                width: "auto",
                objectFit: "contain",
                pointerEvents: "none",
                filter: "drop-shadow(0 16px 22px rgba(0,0,0,0.35))",
              }}
            />
          </div>
        </Reveal>
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>Categorías</h2>
        <Carousel
          data={CATEGORIA_GRUPOS}
          keyExtractor={(g) => g.id}
          itemWidth={72}
          gap={14}
          itemsPerPress={4}
          ariaLabel="Categorías"
          renderItem={(g) => (
            <Link
              to={`/explorar?grupo=${g.id}`}
              className="category-badge"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 72 }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 60,
                  height: 60,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 38,
                  lineHeight: 1,
                  filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.28))",
                }}
              >
                {g.emoji}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", textAlign: "center" }}>{g.label}</span>
            </Link>
          )}
        />
      </section>

      <ElSalvadorMap counts={conteoDepartamentos} productosZona={productos} municipio={municipio} onZonaChange={elegirZona} />

      <Section title="Para ti" seeAll="/explorar">
        {productos === null ? (
          <BentoSkeleton />
        ) : productos.length === 0 ? (
          <EmptyState icon={<Storefront size={26} />} title="Aún no hay productos en tu zona" description="Prueba explorando otras categorías o vuelve más tarde." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {productos.map((p, i) => (
              <Reveal key={p.id} index={i} style={{ gridColumn: i === 0 ? "span 2" : "span 1", gridRow: i === 0 ? "span 2" : undefined }}>
                <ProductCard producto={p} variant={i === 0 ? "large" : "medium"} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      <Section title="Nuevas en tu zona" seeAll="/explorar">
        <HorizontalStores tiendas={nuevas} />
      </Section>

      <Section title="Tiendas destacadas" seeAll="/explorar">
        <HorizontalStores tiendas={destacadas} />
      </Section>

      <style>{`
        @media (max-width: 760px) {
          .hero-emoji { display: none; }
          .hero-banner > div { min-height: 0 !important; }
          .hero-copy { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, seeAll, children }: { title: string; seeAll: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 16 }}>{title}</h2>
        <Link to={seeAll} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cyan)" }}>
          Ver todo
        </Link>
      </div>
      {children}
    </section>
  );
}

function HorizontalStores({ tiendas }: { tiendas: Tienda[] | null }) {
  if (tiendas === null) {
    return (
      <div style={{ display: "flex", gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 200, flexShrink: 0 }}>
            <Skeleton height={150} radius="var(--radius-md)" />
          </div>
        ))}
      </div>
    );
  }
  if (tiendas.length === 0) {
    return <EmptyState icon={<Storefront size={24} />} title="Nada por aquí todavía" description="Vuelve pronto — se están sumando tiendas en tu zona." />;
  }
  return (
    <Carousel
      data={tiendas}
      keyExtractor={(t) => String(t.id)}
      itemWidth={200}
      gap={14}
      itemsPerPress={2}
      ariaLabel="Tiendas"
      renderItem={(t) => <StoreCard tienda={t} />}
    />
  );
}

function BentoSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      <div style={{ gridColumn: "span 2", gridRow: "span 2" }}>
        <Skeleton height={356} radius="var(--radius-md)" />
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={170} radius="var(--radius-md)" />
      ))}
    </div>
  );
}
