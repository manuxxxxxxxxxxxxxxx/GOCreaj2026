import { get, post } from "./client";
import type { ChatMensaje, Conversacion, Usuario } from "../types";

export const chatApi = {
  conversaciones: (params: { tab?: "todos" | "noLeidos" | "favoritos" | "archivados"; q?: string } = {}) =>
    get<{ ok: true; conversaciones: Conversacion[]; total_no_leidos: number }>("chat_multi", "conversaciones", params),

  mensajes: (otro_id: number) =>
    get<{ ok: true; mensajes: ChatMensaje[]; otro: Usuario | null }>("chat_multi", "mensajes", { otro_id }),

  enviar: (data: {
    receptor_id: number;
    tipo?: "texto" | "imagen" | "video" | "ubicacion" | "pdf" | "audio";
    mensaje?: string;
    adjunto?: string;
    nombre?: string;
    tamano?: number;
    duracion?: number;
    lat?: number;
    lng?: number;
    pedido_id?: number;
    reply_to_id?: number;
    reply_snapshot?: Record<string, unknown>;
  }) => post<{ ok: true; id: number }>("chat_multi", "enviar", data),

  toggleArchivado: (otro_id: number) => post<{ ok: true; archivado: number }>("chat_multi", "toggle_archivado", { otro_id }),

  toggleFavorito: (otro_id: number) => post<{ ok: true; favorito: number }>("chat_multi", "toggle_favorito", { otro_id }),

  unreadTotal: () => get<{ ok: true; total: number }>("chat_multi", "unread_total"),

  reaccionar: (chat_id: number, emoji: string) =>
    post<{ ok: true; reaccion: string | null }>("chat_multi", "reaccionar", { chat_id, emoji }),

  eliminarMensaje: (chat_id: number) => post<{ ok: true }>("chat_multi", "eliminar_mensaje", { chat_id }),

  iniciarLlamada: (receptor_id: number, tipo: "voz" | "video" = "voz") =>
    post<{ ok: true; llamada_id: number; room: string }>("chat_multi", "iniciar_llamada", { receptor_id, tipo }),

  responderLlamada: (llamada_id: number, aceptar: boolean) =>
    post<{ ok: true; estado: string }>("chat_multi", "responder_llamada", { llamada_id, aceptar }),

  finalizarLlamada: (llamada_id: number, duracion: number) =>
    post<{ ok: true }>("chat_multi", "finalizar_llamada", { llamada_id, duracion }),

  llamadasEntrantes: () =>
    get<{ ok: true; llamada: { id: number; tipo: string; webrtc_room: string; nombre: string; foto_perfil: string | null; emisor_id: number } | null }>(
      "chat_multi",
      "llamadas_entrantes",
    ),

  enviarSenal: (llamada_id: number, tipo: "offer" | "answer" | "candidate" | "hangup", payload: unknown) =>
    post<{ ok: true }>("chat_multi", "enviar_senal", { llamada_id, tipo, payload }),

  obtenerSenales: (llamada_id: number, after_id: number) =>
    get<{ ok: true; senales: { id: number; tipo: "offer" | "answer" | "candidate" | "hangup"; payload: unknown }[] }>(
      "chat_multi",
      "obtener_senales",
      { llamada_id, after_id },
    ),

  contactos: () => get<{ ok: true; contactos: Usuario[] }>("chat_multi", "contactos"),

  desdeProducto: (producto_id: number, mensaje?: string) =>
    post<{ ok: true; otro_id: number; otro_nombre: string; producto: Record<string, unknown> }>("chat_multi", "desde_producto", {
      producto_id,
      mensaje,
    }),

  buscarUsuarios: (q: string, rol?: string) => get<{ ok: true; usuarios: Usuario[] }>("chat_multi", "buscar_usuarios", { q, rol }),

  perfilPublicoRepartidor: (usuario_id: number) =>
    get<{
      ok: true;
      perfil: { id: number; nombre: string; foto_perfil: string | null; descripcion: string | null; telefono: string | null; repartidor_calificacion_promedio: number; repartidor_total_resenas: number; entregas_completadas: number };
      resenas: { id: number; estrellas: number; comentario: string; created_at: string; comprador_nombre: string }[];
    }>("chat_multi", "perfil_publico_repartidor", { usuario_id }),

  reportar: (otro_usuario_id: number, motivo: string, detalle?: string) =>
    post<{ ok: true }>("chat_multi", "reportar_chat", { otro_usuario_id, motivo, detalle }),
};
