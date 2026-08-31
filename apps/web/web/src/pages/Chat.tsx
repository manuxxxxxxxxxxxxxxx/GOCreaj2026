import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowBendUpLeft,
  Check,
  Checks,
  ChatCircleDots,
  DownloadSimple,
  FileArrowUp,
  FilePdf,
  Image as ImageIcon,
  MagnifyingGlass,
  MapPin,
  Pause,
  Paperclip,
  PaperPlaneTilt,
  Phone,
  Play,
  Smiley,
  Star,
  StarHalf,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { chatApi, ApiError } from "../lib/api";
import type { ChatMensaje, Conversacion } from "../lib/types";
import { relativeTime, formatTime, fileToBase64, money } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useCall } from "../context/CallContext";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { MapView } from "../components/ui/MapView";
import { AttachmentPreviewSheet } from "../components/domain/chat/AttachmentPreviewSheet";
import { LocationPreviewSheet } from "../components/domain/chat/LocationPreviewSheet";
import { VoiceRecorder } from "../components/domain/chat/VoiceRecorder";
import { EmojiPicker } from "../components/domain/chat/EmojiPicker";
import { MapViewerSheet } from "../components/domain/chat/MapViewerSheet";

interface ReplySnapshot {
  nombre: string;
  mensaje: string;
  tipo: ChatMensaje["tipo"];
}

/** Snapshot que arma chat_multi.php?action=desde_producto (botón "Preguntar" en Reels). */
interface ProductoSnapshot {
  producto_id: number;
  nombre: string;
  imagen: string | null;
  precio: number;
  tienda: string;
  tienda_id: number;
  es_reel: boolean;
  video_url: string | null;
}

const toolbarBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "1px solid var(--border)",
  background: "var(--surface-1)",
  color: "var(--text-muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

type Tab = "todos" | "noLeidos" | "favoritos" | "archivados";

export function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [tab, setTab] = useState<Tab>("todos");
  const [q, setQ] = useState("");
  const [conversaciones, setConversaciones] = useState<Conversacion[] | null>(null);

  const cargarLista = useCallback(() => {
    chatApi
      .conversaciones({ tab, q: q || undefined })
      .then((r) => setConversaciones(r.conversaciones))
      .catch(() => setConversaciones([]));
  }, [tab, q]);

  useEffect(() => {
    cargarLista();
    const t = window.setInterval(cargarLista, 8000);
    return () => window.clearInterval(t);
  }, [cargarLista]);

  const otroId = id ? Number(id) : null;

  return (
    <div style={{ position: "fixed", top: 68, left: 0, right: 0, bottom: 0, overflow: "hidden", padding: "20px 24px" }}>
      <div style={{ maxWidth: 1160, height: "100%", margin: "0 auto", display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface-1)", overflow: "hidden" }}>
          <div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
            <div style={{ position: "relative" }}>
              <MagnifyingGlass size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar conversación"
                style={{ width: "100%", height: 36, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-2)", padding: "0 10px 0 30px", fontSize: 13 }}
              />
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
              {(["todos", "noLeidos", "favoritos", "archivados"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{ flex: 1, padding: "6px 4px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: tab === t ? "var(--cyan-bg)" : "transparent", color: tab === t ? "var(--cyan)" : "var(--text-muted)" }}
                >
                  {t === "todos" ? "Todos" : t === "noLeidos" ? "No leídos" : t === "favoritos" ? "Favoritos" : "Archivados"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {conversaciones === null ? (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={52} />
                ))}
              </div>
            ) : conversaciones.length === 0 ? (
              <EmptyState icon={<ChatCircleDots size={22} />} title="Sin conversaciones" />
            ) : (
              conversaciones.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/chat/${c.id}`)}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    width: "100%",
                    padding: "12px 14px",
                    background: otroId === c.id ? "var(--cyan-bg)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Avatar nombre={c.nombre} foto={c.foto_perfil} size={40} online={!!c.en_linea} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</span>
                      {c.ultimo_mensaje && <span style={{ fontSize: 10.5, color: "var(--text-muted)", flexShrink: 0 }}>{relativeTime(c.ultimo_mensaje.created_at)}</span>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.ultimo_mensaje?.mensaje ?? "Sin mensajes"}</span>
                      {c.no_leidos > 0 && (
                        <span style={{ minWidth: 16, height: 16, borderRadius: "var(--radius-pill)", background: "var(--cyan)", color: "var(--cyan-ink)", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {c.no_leidos}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface-1)", overflow: "hidden" }}>
          {otroId ? <ChatThread key={otroId} otroId={otroId} usuarioId={usuario?.id ?? 0} onMeta={cargarLista} /> : <EmptyState icon={<ChatCircleDots size={26} />} title="Selecciona una conversación" description="Elige un chat de la lista para ver los mensajes." />}
        </div>
      </div>
    </div>
  );
}

type PendienteAdjunto = { file: File; kind: "imagen" | "video" | "pdf" } | null;

function ChatThread({ otroId, usuarioId, onMeta }: { otroId: number; usuarioId: number; onMeta: () => void }) {
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState<ChatMensaje[] | null>(null);
  const [otro, setOtro] = useState<{ nombre: string; foto_perfil: string | null; en_linea?: number } | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [meta, setMeta] = useState<{ archivado: number; favorito: number } | null>(null);
  const [pendiente, setPendiente] = useState<PendienteAdjunto>(null);
  const [pidiendoUbicacion, setPidiendoUbicacion] = useState(false);
  const [menuAdjuntar, setMenuAdjuntar] = useState(false);
  const [emojiComposerAbierto, setEmojiComposerAbierto] = useState(false);
  const [reaccionandoA, setReaccionandoA] = useState<number | null>(null);
  const [respondiendoA, setRespondiendoA] = useState<ChatMensaje | null>(null);
  const [verMapaDe, setVerMapaDe] = useState<{ lat: number; lng: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const filePdfRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const reaccionBtnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const toast = useToast();
  const { iniciar: iniciarLlamada, estado: estadoLlamada } = useCall();

  const cargar = useCallback(() => {
    chatApi
      .mensajes(otroId)
      .then((r) => {
        setMensajes(r.mensajes);
        setOtro(r.otro);
      })
      .catch(() => setMensajes([]));
  }, [otroId]);

  useEffect(() => {
    cargar();
    const t = window.setInterval(cargar, 4000);
    return () => window.clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes]);

  /** Construye la cita compacta que va sobre el mensaje al que se responde. */
  const snapshotDe = (m: ChatMensaje): ReplySnapshot => {
    const previews: Partial<Record<ChatMensaje["tipo"], string>> = {
      imagen: "Foto",
      video: "Video",
      pdf: m.adjunto_nombre ?? "Documento",
      audio: "Nota de voz",
      ubicacion: "Ubicación compartida",
    };
    return {
      nombre: m.emisor_id === usuarioId ? "Tú" : otro?.nombre ?? "",
      mensaje: previews[m.tipo] ?? m.mensaje,
      tipo: m.tipo,
    };
  };

  const datosRespuesta = () =>
    respondiendoA ? { reply_to_id: respondiendoA.id, reply_snapshot: snapshotDe(respondiendoA) as unknown as Record<string, unknown> } : {};

  const enviar = async (extra?: Partial<Parameters<typeof chatApi.enviar>[0]>) => {
    if (!texto.trim() && !extra) return;
    setEnviando(true);
    try {
      await chatApi.enviar({ receptor_id: otroId, mensaje: texto.trim() || undefined, ...datosRespuesta(), ...extra });
      setTexto("");
      setRespondiendoA(null);
      cargar();
      onMeta();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el mensaje.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const confirmarAdjunto = async (caption: string) => {
    if (!pendiente) return;
    setEnviando(true);
    try {
      const b64 = await fileToBase64(pendiente.file);
      await chatApi.enviar({
        receptor_id: otroId,
        tipo: pendiente.kind,
        mensaje: caption || undefined,
        adjunto: b64,
        nombre: pendiente.kind === "pdf" ? pendiente.file.name : undefined,
        tamano: pendiente.file.size,
        ...datosRespuesta(),
      });
      setPendiente(null);
      setRespondiendoA(null);
      cargar();
      onMeta();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el archivo.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const confirmarUbicacion = async (lat: number, lng: number) => {
    setEnviando(true);
    try {
      await chatApi.enviar({ receptor_id: otroId, tipo: "ubicacion", lat, lng, ...datosRespuesta() });
      setPidiendoUbicacion(false);
      setRespondiendoA(null);
      cargar();
      onMeta();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la ubicación.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const enviarAudio = async (dataUri: string, duracionSeg: number) => {
    try {
      await chatApi.enviar({ receptor_id: otroId, tipo: "audio", adjunto: dataUri, duracion: duracionSeg, ...datosRespuesta() });
      setRespondiendoA(null);
      cargar();
      onMeta();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la nota de voz.", "error");
    }
  };

  const insertarEmoji = (emoji: string) => setTexto((t) => t + emoji);

  const reaccionar = async (chatId: number, emoji: string) => {
    setReaccionandoA(null);
    try {
      await chatApi.reaccionar(chatId, emoji);
      cargar();
    } catch {
      toast.show("No se pudo reaccionar al mensaje.", "error");
    }
  };

  if (!mensajes || !otro) {
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <Skeleton height={36} width={200} />
        <Skeleton height={200} />
      </div>
    );
  }

  const llamadaDeshabilitada = estadoLlamada !== "idle";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <Avatar nombre={otro.nombre} foto={otro.foto_perfil} size={36} online={!!otro.en_linea} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{otro.nombre}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{otro.en_linea ? "En línea" : "Desconectado"}</div>
        </div>
        <button
          onClick={() => iniciarLlamada({ id: otroId, nombre: otro.nombre, foto_perfil: otro.foto_perfil }, "voz")}
          disabled={llamadaDeshabilitada}
          aria-label="Llamada de voz"
          style={{ background: "none", border: "none", cursor: llamadaDeshabilitada ? "default" : "pointer", color: "var(--text-muted)", opacity: llamadaDeshabilitada ? 0.4 : 1, display: "flex" }}
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => iniciarLlamada({ id: otroId, nombre: otro.nombre, foto_perfil: otro.foto_perfil }, "video")}
          disabled={llamadaDeshabilitada}
          aria-label="Videollamada"
          style={{ background: "none", border: "none", cursor: llamadaDeshabilitada ? "default" : "pointer", color: "var(--text-muted)", opacity: llamadaDeshabilitada ? 0.4 : 1, display: "flex" }}
        >
          <VideoCamera size={18} />
        </button>
        <button
          onClick={async () => {
            const r = await chatApi.toggleFavorito(otroId);
            setMeta((m) => ({ archivado: m?.archivado ?? 0, favorito: r.favorito }));
            onMeta();
          }}
          aria-label="Favorito"
          style={{ background: "none", border: "none", cursor: "pointer", color: meta?.favorito ? "var(--warn)" : "var(--text-muted)" }}
        >
          {meta?.favorito ? <Star size={18} weight="fill" /> : <StarHalf size={18} />}
        </button>
        <button
          onClick={async () => {
            const r = await chatApi.toggleArchivado(otroId);
            setMeta((m) => ({ favorito: m?.favorito ?? 0, archivado: r.archivado }));
            onMeta();
          }}
          aria-label="Archivar"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
        >
          <Archive size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {mensajes.map((m) => {
          const mio = m.emisor_id === usuarioId;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mio ? "flex-end" : "flex-start" }} className="chat-msg-row">
              <div
                style={{
                  maxWidth: "68%",
                  background: mio ? "var(--cyan)" : "var(--surface-2)",
                  color: mio ? "var(--cyan-ink)" : "var(--text-primary)",
                  borderRadius: mio ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: m.tipo === "texto" ? "9px 12px" : 6,
                  position: "relative",
                }}
              >
                {m.reply_snapshot && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      borderLeft: `3px solid ${mio ? "rgba(255,255,255,0.65)" : "var(--cyan)"}`,
                      background: mio ? "rgba(255,255,255,0.15)" : "var(--surface-1)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      margin: m.tipo === "texto" ? "0 0 6px" : "2px 2px 6px",
                      maxWidth: 260,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{(m.reply_snapshot as unknown as ReplySnapshot).nombre}</span>
                    <span style={{ fontSize: 11.5, opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(m.reply_snapshot as unknown as ReplySnapshot).mensaje}
                    </span>
                  </div>
                )}

                <MensajeContenido
                  m={m}
                  mio={mio}
                  onAbrirMapa={(lat, lng) => setVerMapaDe({ lat, lng })}
                  onAbrirProducto={(p) => navigate(p.es_reel ? `/reels?tienda=${p.tienda_id}&producto=${p.producto_id}` : `/producto/${p.producto_id}`)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, padding: m.tipo === "texto" ? 0 : "4px 6px 0", marginTop: m.tipo === "texto" ? 3 : 0 }}>
                  <span style={{ fontSize: 10, opacity: 0.75 }}>{formatTime(m.created_at)}</span>
                  {mio && (m.leido ? <Checks size={13} weight="bold" /> : <Check size={13} weight="bold" style={{ opacity: 0.7 }} />)}
                </div>

                <div className="chat-msg-toolbar" style={{ position: "absolute", top: -12, [mio ? "left" : "right"]: -12, display: "flex", gap: 4 }}>
                  <button onClick={() => setRespondiendoA(m)} aria-label="Responder" style={toolbarBtnStyle}>
                    <ArrowBendUpLeft size={13} />
                  </button>
                  <button
                    ref={(el) => {
                      if (el) reaccionBtnRefs.current.set(m.id, el);
                    }}
                    onClick={() => setReaccionandoA(m.id)}
                    aria-label="Reaccionar"
                    style={toolbarBtnStyle}
                  >
                    <Smiley size={13} />
                  </button>
                </div>

                {reaccionandoA === m.id && (
                  <EmojiPicker anchorRef={{ current: reaccionBtnRefs.current.get(m.id) ?? null }} onSelect={(e) => reaccionar(m.id, e)} onClose={() => setReaccionandoA(null)} placement="top" />
                )}
              </div>

              {!!m.reacciones?.length && (
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {m.reacciones.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => reaccionar(m.id, r.emoji)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "2px 7px",
                        borderRadius: "var(--radius-pill)",
                        border: `1px solid ${r.mio ? "var(--cyan)" : "var(--border)"}`,
                        background: r.mio ? "var(--cyan-bg)" : "var(--surface-2)",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      <span>{r.emoji}</span>
                      {r.count > 1 && (
                        <span className="tabular" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>
                          {r.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {respondiendoA && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <ArrowBendUpLeft size={15} color="var(--cyan)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan)" }}>Respondiendo a {snapshotDe(respondiendoA).nombre}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{snapshotDe(respondiendoA).mensaje}</div>
          </div>
          <button onClick={() => setRespondiendoA(null)} aria-label="Cancelar respuesta" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: 12, borderTop: "1px solid var(--border)" }}>
        <input ref={fileImgRef} type="file" accept="image/*,video/*" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPendiente({ file: f, kind: f.type.startsWith("video") ? "video" : "imagen" });
          e.target.value = "";
        }} />
        <input ref={filePdfRef} type="file" accept="application/pdf" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPendiente({ file: f, kind: "pdf" });
          e.target.value = "";
        }} />

        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuAdjuntar((v) => !v)} aria-label="Adjuntar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
            <Paperclip size={20} />
          </button>
          {menuAdjuntar && (
            <>
              <div onClick={() => setMenuAdjuntar(false)} style={{ position: "fixed", inset: 0, zIndex: 3 }} />
              <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: 0, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", padding: 6, minWidth: 190, zIndex: 4, animation: "rise var(--dur-fast) var(--ease-out) both" }}>
                <MenuItem icon={<ImageIcon size={16} color="var(--cyan)" />} label="Foto o video" onClick={() => { setMenuAdjuntar(false); fileImgRef.current?.click(); }} />
                <MenuItem icon={<FileArrowUp size={16} color="var(--violet)" />} label="Documento" onClick={() => { setMenuAdjuntar(false); filePdfRef.current?.click(); }} />
                <MenuItem icon={<MapPin size={16} color="var(--coral)" />} label="Ubicación" onClick={() => { setMenuAdjuntar(false); setPidiendoUbicacion(true); }} />
              </div>
            </>
          )}
        </div>

        <button ref={emojiBtnRef} onClick={() => setEmojiComposerAbierto((v) => !v)} aria-label="Emoji" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
          <Smiley size={20} />
        </button>
        {emojiComposerAbierto && <EmojiPicker anchorRef={emojiBtnRef} onSelect={insertarEmoji} onClose={() => setEmojiComposerAbierto(false)} placement="top" />}

        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Escribe un mensaje…"
          style={{ flex: 1, height: 40, borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", padding: "0 16px", fontSize: 13.5 }}
        />

        {texto.trim() ? (
          <button
            onClick={() => enviar()}
            disabled={enviando}
            aria-label="Enviar"
            style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--cyan)", color: "var(--cyan-ink)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: enviando ? 0.5 : 1, flexShrink: 0 }}
          >
            <PaperPlaneTilt size={17} weight="fill" />
          </button>
        ) : (
          <VoiceRecorder onSend={enviarAudio} />
        )}
      </div>

      {pendiente && (
        <AttachmentPreviewSheet file={pendiente.file} kind={pendiente.kind} enviando={enviando} onCancel={() => setPendiente(null)} onConfirm={confirmarAdjunto} />
      )}
      {pidiendoUbicacion && <LocationPreviewSheet enviando={enviando} onCancel={() => setPidiendoUbicacion(false)} onConfirm={confirmarUbicacion} />}
      {verMapaDe && <MapViewerSheet lat={verMapaDe.lat} lng={verMapaDe.lng} onClose={() => setVerMapaDe(null)} />}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="chat-menu-item" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: "var(--radius-sm)", border: "none", background: "none", cursor: "pointer", fontSize: 13, textAlign: "left" }}>
      {icon}
      {label}
    </button>
  );
}

function MensajeContenido({
  m,
  mio,
  onAbrirMapa,
  onAbrirProducto,
}: {
  m: ChatMensaje;
  mio: boolean;
  onAbrirMapa: (lat: number, lng: number) => void;
  onAbrirProducto: (p: ProductoSnapshot) => void;
}) {
  if (m.tipo === "producto" && m.reply_snapshot) {
    const p = m.reply_snapshot as unknown as ProductoSnapshot;
    return (
      <button
        onClick={() => onAbrirProducto(p)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: 6, borderRadius: 12, border: "none", background: "none", cursor: "pointer", textAlign: "left", color: "inherit" }}
      >
        <div style={{ position: "relative", width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--surface-2)" }}>
          {p.imagen && <img src={p.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          {p.es_reel && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
              <Play size={16} weight="fill" color="#fff" />
            </div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {p.es_reel && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: mio ? "inherit" : "var(--cyan)", opacity: mio ? 0.85 : 1, marginBottom: 2 }}>
              <Play size={9} weight="fill" /> REEL
            </div>
          )}
          <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
          <div className="tabular" style={{ fontSize: 12, opacity: 0.8 }}>
            {money(p.precio)}
          </div>
        </div>
      </button>
    );
  }
  if (m.tipo === "imagen" && m.adjunto) {
    return (
      <div>
        <img src={m.adjunto} alt="" style={{ maxWidth: 260, maxHeight: 300, borderRadius: 12, display: "block", objectFit: "cover" }} />
        {m.mensaje && m.mensaje !== "Imagen" && <div style={{ fontSize: 13.5, padding: "6px 6px 2px" }}>{m.mensaje}</div>}
      </div>
    );
  }
  if (m.tipo === "video" && m.adjunto) {
    return (
      <div>
        <video src={m.adjunto} controls style={{ maxWidth: 260, maxHeight: 300, borderRadius: 12, display: "block" }} />
        {m.mensaje && m.mensaje !== "Video" && <div style={{ fontSize: 13.5, padding: "6px 6px 2px" }}>{m.mensaje}</div>}
      </div>
    );
  }
  if (m.tipo === "pdf" && m.adjunto) {
    return (
      <a href={m.adjunto} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, textDecoration: "none", color: "inherit" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FilePdf size={19} weight="fill" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.adjunto_nombre ?? "Documento.pdf"}</div>
          {m.adjunto_tamano ? <div style={{ fontSize: 10.5, opacity: 0.75 }}>{(m.adjunto_tamano / 1024).toFixed(0)} KB</div> : null}
        </div>
        <DownloadSimple size={16} />
      </a>
    );
  }
  if (m.tipo === "audio" && m.adjunto) {
    return <AudioMensaje src={m.adjunto} duracion={m.adjunto_duracion ?? 0} mio={mio} />;
  }
  if (m.tipo === "ubicacion" && m.lat && m.lng) {
    const lat = Number(m.lat);
    const lng = Number(m.lng);
    return (
      <button onClick={() => onAbrirMapa(lat, lng)} style={{ display: "block", width: "100%", color: "inherit", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <div style={{ pointerEvents: "none" }}>
          <MapView markers={[{ id: "u", lat, lng, color: "var(--coral)" }]} height={130} zoom={15} fitToMarkers={false} center={[lng, lat]} radius="10px" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 6px 2px", fontSize: 12 }}>
          <MapPin size={13} weight="fill" /> Ver ubicación
        </div>
      </button>
    );
  }
  return <div style={{ fontSize: 13.5, padding: m.tipo === "texto" ? 0 : 4 }}>{m.mensaje}</div>;
}

function AudioMensaje({ src, duracion, mio }: { src: string; duracion: number; mio: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setReproduciendo(true);
    } else {
      audio.pause();
      setReproduciendo(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", minWidth: 200 }}>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => {
          setReproduciendo(false);
          setProgreso(0);
        }}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          if (audio.duration) setProgreso(audio.currentTime / audio.duration);
        }}
      />
      <button
        onClick={toggle}
        aria-label={reproduciendo ? "Pausar" : "Reproducir"}
        style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: mio ? "rgba(255,255,255,0.25)" : "var(--cyan-bg)", color: mio ? "inherit" : "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
      >
        {reproduciendo ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
      </button>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: mio ? "rgba(255,255,255,0.35)" : "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${progreso * 100}%`, height: "100%", background: mio ? "#fff" : "var(--cyan)" }} />
      </div>
      <span className="tabular" style={{ fontSize: 10.5, opacity: 0.8, flexShrink: 0 }}>
        {Math.floor(duracion / 60)}:{String(duracion % 60).padStart(2, "0")}
      </span>
    </div>
  );
}
