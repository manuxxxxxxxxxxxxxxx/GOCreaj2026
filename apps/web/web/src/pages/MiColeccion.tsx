import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BookmarkSimple, Heart } from "@phosphor-icons/react";
import { interaccionesApi } from "../lib/api";
import type { Producto } from "../lib/types";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { BackButton } from "../components/ui/BackButton";
import { ProductGrid } from "../components/domain/ProductGrid";

const LIMIT = 30;

const TIPOS = {
  likes: { titulo: "Me gusta", icon: <Heart size={22} />, vacio: "Los productos y reels que te gusten aparecerán aquí.", fetch: interaccionesApi.misLikes },
  guardados: { titulo: "Guardados", icon: <BookmarkSimple size={22} />, vacio: "Guarda productos y reels desde el ícono de marcador para verlos aquí.", fetch: interaccionesApi.misGuardados },
};

export function MiColeccion() {
  const { tipo } = useParams<{ tipo: "likes" | "guardados" }>();
  const cfg = tipo ? TIPOS[tipo] : null;

  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cargandoMas, setCargandoMas] = useState(false);

  useEffect(() => {
    if (!cfg) return;
    setProductos(null);
    setPage(1);
    cfg.fetch(1, LIMIT).then((r) => {
      setProductos(r.productos);
      setTotal(r.total);
    });
  }, [tipo]);

  const cargarMas = () => {
    if (!cfg) return;
    const siguiente = page + 1;
    setCargandoMas(true);
    cfg.fetch(siguiente, LIMIT).then((r) => {
      setProductos((prev) => [...(prev ?? []), ...r.productos]);
      setPage(siguiente);
      setCargandoMas(false);
    });
  };

  if (!cfg) return null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 20 }}>
          {cfg.titulo} {total > 0 && `(${total})`}
        </h1>
      </div>

      {productos === null ? (
        <Skeleton height={300} />
      ) : productos.length === 0 ? (
        <EmptyState icon={cfg.icon} title={`Sin ${cfg.titulo.toLowerCase()} todavía`} description={cfg.vacio} />
      ) : (
        <>
          <ProductGrid productos={productos} />
          {productos.length < total && (
            <Button variant="secondary" onClick={cargarMas} loading={cargandoMas}>
              Cargar más
            </Button>
          )}
        </>
      )}
    </div>
  );
}
