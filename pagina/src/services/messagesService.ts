import api from './apiClient';
import type { Message, Conversation } from '../types';

const DEMO_CONVERSATIONS: Conversation[] = [
  { id: 'c1', name: 'Panadería Don José', type: 'vendedor',   lastMessage: '¡Tu pedido está listo!',              timestamp: '10:32 AM', unread: 2, online: true,  initials: 'PJ' },
  { id: 'c2', name: 'Carlos Martínez',   type: 'repartidor', lastMessage: 'Estoy a 3 min de tu ubicación',       timestamp: '10:28 AM', unread: 1, online: true,  initials: 'CM' },
  { id: 'c3', name: 'Huerto Verde',      type: 'vendedor',   lastMessage: 'Tenemos verduras frescas disponibles', timestamp: 'Ayer',     unread: 0, online: false, initials: 'HV' },
  { id: 'c4', name: 'Soporte',           type: 'soporte',    lastMessage: '¿En qué te podemos ayudar?',          timestamp: 'Ayer',     unread: 0, online: true,  initials: 'S'  },
  { id: 'c5', name: 'Café del Barrio',   type: 'vendedor',   lastMessage: 'Gracias por tu compra 😊',            timestamp: 'Lun',      unread: 0, online: false, initials: 'CB' },
];

const DEMO_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'other', recipientId: 'me', body: '¡Hola! ¿En qué te puedo ayudar?',                    timestamp: Date.now() - 3600000, read: true  },
  { id: 'm2', senderId: 'me',    recipientId: 'other', body: 'Quiero saber si tienen pan integral disponible.',  timestamp: Date.now() - 3500000, read: true  },
  { id: 'm3', senderId: 'other', recipientId: 'me', body: '¡Claro! Tenemos pan artesanal integral recién hecho.',timestamp: Date.now() - 3400000, read: true  },
  { id: 'm4', senderId: 'other', recipientId: 'me', body: '¿Te lo envío en el próximo pedido?',                  timestamp: Date.now() - 3300000, read: true  },
  { id: 'm5', senderId: 'me',    recipientId: 'other', body: '¡Sí, por favor! Agrega 2 unidades.',              timestamp: Date.now() - 3200000, read: true  },
  { id: 'm6', senderId: 'other', recipientId: 'me', body: '¡Tu pedido está listo! El repartidor va en camino.', timestamp: Date.now() - 60000,   read: false },
];

export async function getConversations(): Promise<Conversation[]> {
  try {
    const res = await api.get('/messages/conversations');
    // Map backend rows to Conversation shape
    return (res.data as any[]).map((row) => ({
      id:          row.partner_id,
      name:        row.partner_name || row.partner_email,
      type:        'vendedor' as const,
      lastMessage: row.last_body ?? '',
      timestamp:   row.last_at ? new Date(row.last_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      unread:      Number(row.unread_count) || 0,
      online:      false,
      initials:    (row.partner_name || row.partner_email || '?').slice(0, 2).toUpperCase(),
    }));
  } catch {
    return DEMO_CONVERSATIONS;
  }
}

export async function getMessages(partnerId: string): Promise<Message[]> {
  try {
    const res = await api.get(`/messages/${partnerId}`);
    return (res.data as any[]).map((m) => ({
      id:          m.id,
      senderId:    m.sender_id,
      recipientId: m.recipient_id,
      body:        m.body,
      timestamp:   new Date(m.created_at).getTime(),
      read:        m.is_read,
      imageUrl:    m.image_url ?? undefined,
    }));
  } catch {
    return DEMO_MESSAGES;
  }
}

export async function sendMessage(
  recipientId: string,
  body: string,
  imageUrl?: string
): Promise<Message | null> {
  try {
    const res = await api.post('/messages', { recipientId, body, imageUrl });
    const m = res.data;
    return {
      id:          m.id,
      senderId:    m.sender_id,
      recipientId: m.recipient_id,
      body:        m.body,
      timestamp:   new Date(m.created_at).getTime(),
      read:        m.is_read,
    };
  } catch {
    return null;
  }
}

export async function markConversationRead(partnerId: string): Promise<void> {
  try {
    await api.patch(`/messages/${partnerId}/read`);
  } catch {}
}

export async function getUnreadCount(): Promise<number> {
  try {
    const res = await api.get('/messages/unread');
    return res.data.count ?? 0;
  } catch {
    return 0;
  }
}
