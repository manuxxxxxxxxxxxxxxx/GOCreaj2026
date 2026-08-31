import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { Skeleton } from "../../components/ui/Skeleton";

interface MunicipioCobertura {
  id: number;
  nombre: string;
  departamento: string;
  cobertura_activa: number;
}

export function AdminCobertura() {
  const [municipios, setMunicipios] = useState<MunicipioCobertura[] | null>(null);

  const cargar = () => {
    adminApi.municipiosCobertura().then((r) => setMunicipios(r.municipios));
  };

  useEffect(cargar, []);

  const toggle = async (m: MunicipioCobertura) => {
    setMunicipios((prev) => prev?.map((x) => (x.id === m.id ? { ...x, cobertura_activa: x.cobertura_activa ? 0 : 1 } : x)) ?? null);
    await adminApi.toggleCobertura(m.id);
  };

  if (municipios === null) return <Skeleton height={400} />;

  const porDepto = municipios.reduce<Record<string, MunicipioCobertura[]>>((acc, m) => {
    (acc[m.departamento] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 800 }}>
      <div>
        <h1 style={{ fontSize: 20 }}>Zonas de cobertura</h1>
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>Activa o desactiva la entrega en cada municipio.</p>
      </div>
      {Object.entries(porDepto).map(([depto, ms]) => (
        <div key={depto}>
          <h2 style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>{depto}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ms.map((m) => (
              <button
                key={m.id}
                onClick={() => toggle(m)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: `1px solid ${m.cobertura_activa ? "var(--ok)" : "var(--border)"}`,
                  background: m.cobertura_activa ? "var(--ok-bg)" : "var(--surface-2)",
                  color: m.cobertura_activa ? "var(--ok-ink)" : "var(--text-muted)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
