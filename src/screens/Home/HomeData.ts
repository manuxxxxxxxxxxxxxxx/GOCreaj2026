// src/screens/Home/HomeData.ts

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  emoji: string;
  bg: string;
  color: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface Deal {
  id: number;
  name: string;
  original: string;
  price: string;
  discount: string;
  image: string;
  store: string;
  sold: number;
}

export const BANNERS: Banner[] = [
  { id: 1, title: '¡Envío GRATIS hoy!', subtitle: 'En tu primera compra local', cta: 'Pedir ahora', emoji: '🛵', bg: 'https://images.unsplash.com/photo-1764745223157-64f76610cb3c?auto=format&fit=crop&w=600&q=80', color: '#059669' },
  { id: 2, title: 'Tacos El Compa', subtitle: 'Birria fresquita • Solo hoy 2×1', cta: 'Ver oferta', emoji: '🌮', bg: 'https://images.unsplash.com/photo-1615312090659-f1da3fd2d85b?auto=format&fit=crop&w=600&q=80', color: '#f97316' },
  { id: 3, title: 'Artesanías Locales', subtitle: 'Piezas únicas con 20% OFF', cta: 'Explorar', emoji: '🏺', bg: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=600&q=80', color: '#a855f7' },
];

export const CATS: Category[] = [
  { id: 0, name: 'Todos', icon: '🌟' }, { id: 1, name: 'Comida', icon: '🍔' },
  { id: 2, name: 'Artesanías', icon: '🏺' }, { id: 3, name: 'Moda', icon: '👗' },
  { id: 4, name: 'Mercado', icon: '🥦' }, { id: 5, name: 'Café', icon: '☕' },
];

export const DEALS: Deal[] = [
  { id: 1, name: 'Tacos Birria x3', original: '$12.00', price: '$8.50', discount: '29%', image: 'https://images.unsplash.com/photo-1726514733212-0d99c0e2f1f4?auto=format&fit=crop&w=300&q=80', store: 'El Compa', sold: 67 },
  { id: 2, name: 'Jugo Verde 500ml', original: '$4.50', price: '$2.90', discount: '35%', image: 'https://images.unsplash.com/photo-1583577612013-4fecf7bf8f13?auto=format&fit=crop&w=300&q=80', store: 'NaturalMix', sold: 43 },
];

export const TRENDING = [
  { id: 1, name: 'Mochila Piel Artesanal', price: '$45.00', image: 'https://images.unsplash.com/photo-1731169243668-20feffc9d65a?auto=format&fit=crop&w=300&q=80', rating: 4.9, reviews: 128, tag: 'Más vendido', tagColor: '#fef3c7', tagTextColor: '#b45309' },
  { id: 2, name: 'Vasija Oaxaqueña', price: '$28.00', image: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=300&q=80', rating: 4.8, reviews: 94, tag: 'Artesanal', tagColor: '#ede9fe', tagTextColor: '#7c3aed' },
];

export const NEARBY = [
  { id: 1, name: 'Tacos El Compa', category: 'Comida Callejera', image: 'https://images.unsplash.com/photo-1615312090659-f1da3fd2d85b?auto=format&fit=crop&w=200&q=80', rating: 4.8, distance: '1.2 km', time: '15-25 min', open: true },
  { id: 3, name: 'Café El Retiro', category: 'Cafetería', image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=200&q=80', rating: 4.9, distance: '0.8 km', time: '10-15 min', open: true },
];