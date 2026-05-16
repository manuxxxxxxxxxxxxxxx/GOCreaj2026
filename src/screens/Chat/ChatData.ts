// src/screens/Chat/ChatData.ts

export type ChatType = 'vendedor' | 'repartidor' | 'soporte';

export interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  type: ChatType;
  online: boolean;
  status: string;
  statusColor: string;
}

export const CHATS: Chat[] = [
  { id: 1, name: 'Tacos El Compa', avatar: 'https://images.unsplash.com/photo-1767327142296-c4999b0aadb9?auto=format&fit=crop&w=100&q=80', lastMsg: '¡Tu pedido está en camino! 🛵', time: '2 min', unread: 2, type: 'vendedor', online: true, status: 'En camino', statusColor: '#059669' },
  { id: 2, name: 'Artesanías Oaxaca', avatar: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=100&q=80', lastMsg: 'Hola, ¿tienes disponible la vasija XL?', time: '15 min', unread: 0, type: 'vendedor', online: true, status: 'En línea', statusColor: '#059669' },
  { id: 3, name: 'Repartidor Carlos', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80', lastMsg: 'Llegando en 5 minutos 🛵', time: '5 min', unread: 1, type: 'repartidor', online: true, status: '📍 A 500m', statusColor: '#f97316' },
  { id: 4, name: 'Soporte [SV]Go', avatar: '', lastMsg: '¿En qué podemos ayudarte?', time: '1h', unread: 0, type: 'soporte', online: true, status: 'Soporte 24/7', statusColor: '#059669' },
];