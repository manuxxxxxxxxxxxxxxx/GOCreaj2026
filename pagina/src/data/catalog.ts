import type { Product, Driver, Coupon, User } from '../types';

export const CATALOG: Product[] = [
  { id: 1,  name: 'Pan Artesanal Integral',   price: 4.05,  emoji: '🥖', cat: 'panaderia',  seller: 'Panadería Don José',  rating: 4.8, reviews: 124, badge: 'Promo',   prepTime: '15 min', distance: '0.3 km' },
  { id: 2,  name: 'Verduras Orgánicas Mix',   price: 12.00, emoji: '🥬', cat: 'alimentos',  seller: 'Huerto Verde',        rating: 4.9, reviews: 89,  badge: 'Nuevo',   prepTime: '5 min',  distance: '0.7 km' },
  { id: 3,  name: 'Café Premium 250g',        price: 8.75,  emoji: '☕', cat: 'bebidas',    seller: 'Café del Barrio',     rating: 4.7, reviews: 203, badge: 'Destacado', prepTime: '10 min', distance: '0.5 km' },
  { id: 4,  name: 'Artesanías Decorativas',   price: 21.25, emoji: '🎨', cat: 'artesanias', seller: 'Manos Creativas',     rating: 5.0, reviews: 56,  badge: 'Popular', prepTime: '—',      distance: '1.2 km' },
  { id: 5,  name: 'Croissant de Mantequilla', price: 3.50,  emoji: '🥐', cat: 'panaderia',  seller: 'Panadería Don José',  rating: 4.6, reviews: 78,  badge: 'Promo',   prepTime: '12 min', distance: '0.3 km' },
  { id: 6,  name: 'Frutas Tropicales Mix',    price: 9.50,  emoji: '🍎', cat: 'alimentos',  seller: 'Huerto Verde',        rating: 4.8, reviews: 112, badge: 'Nuevo',   prepTime: '5 min',  distance: '0.7 km' },
  { id: 7,  name: 'Café Latte',               price: 5.25,  emoji: '☕', cat: 'bebidas',    seller: 'Café del Barrio',     rating: 4.9, reviews: 321, badge: 'Popular', prepTime: '8 min',  distance: '0.5 km' },
  { id: 8,  name: 'Cupcake Vainilla',         price: 3.25,  emoji: '🧁', cat: 'panaderia',  seller: 'Panadería Don José',  rating: 4.7, reviews: 67,  badge: 'Nuevo',   prepTime: '10 min', distance: '0.3 km' },
  { id: 9,  name: 'Baguette Clásica',         price: 4.00,  emoji: '🥖', cat: 'panaderia',  seller: 'Panadería Don José',  rating: 4.5, reviews: 45,  badge: 'Promo',   prepTime: '12 min', distance: '0.3 km' },
  { id: 10, name: 'Galletas de Avena',        price: 6.00,  emoji: '🍪', cat: 'panaderia',  seller: 'Panadería Don José',  rating: 4.6, reviews: 88,  badge: 'Destacado', prepTime: '8 min',  distance: '0.3 km' },
  { id: 11, name: 'Té de Jamaica',            price: 3.75,  emoji: '🌺', cat: 'bebidas',    seller: 'Café del Barrio',     rating: 4.8, reviews: 142, badge: 'Popular', prepTime: '5 min',  distance: '0.5 km' },
  { id: 12, name: 'Miel Local Pura',          price: 9.00,  emoji: '🍯', cat: 'alimentos',  seller: 'Huerto Verde',        rating: 4.9, reviews: 97,  badge: 'Destacado', prepTime: '—',      distance: '0.7 km' },
];

export const DRIVERS: Driver[] = [
  { name: 'Carlos Martínez', rating: 4.9, reviews: 234, vehicle: 'Moto ABC-123', vehicleType: 'moto', initials: 'CM',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=120&h=120&fit=crop' },
  { name: 'María López',     rating: 4.8, reviews: 187, vehicle: 'Moto XJK-450', vehicleType: 'moto', initials: 'ML',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop' },
  { name: 'José Hernández',  rating: 4.7, reviews: 312, vehicle: 'Bicicleta',    vehicleType: 'bici', initials: 'JH',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop' },
  { name: 'Ana Ramírez',     rating: 5.0, reviews: 98,  vehicle: 'Moto QPL-221', vehicleType: 'moto', initials: 'AR',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop' },
];

export const COUPONS: Record<string, Coupon> = {
  DESCUENTO10: { type: 'percent',  value: 0.10, label: '10% de descuento' },
  ENVIOGRATIS: { type: 'shipping', value: 1.00, label: 'Envío gratis' },
  BIENVENIDO:  { type: 'percent',  value: 0.15, label: '15% bienvenida' },
};

export const SHIPPING_FEE = 2.50;

export const DEMO_USERS: User[] = [
  { id: 'u1',  name: 'Ana García',          email: 'ana@demo.com',    role: 'buyer',        status: 'verified', joinedAt: Date.now() - 86400000 * 30  },
  { id: 'u2',  name: 'Panadería Don José',  email: 'jose@demo.com',   role: 'seller',       status: 'verified', joinedAt: Date.now() - 86400000 * 90  },
  { id: 'u3',  name: 'Carlos Martínez',     email: 'carlos@demo.com', role: 'driver',       status: 'verified', joinedAt: Date.now() - 86400000 * 15  },
  { id: 'u4',  name: 'María López',         email: 'maria@demo.com',  role: 'driver',       status: 'pending',  joinedAt: Date.now() - 86400000 * 2   },
  { id: 'u5',  name: 'Huerto Verde',        email: 'huerto@demo.com', role: 'seller',       status: 'verified', joinedAt: Date.now() - 86400000 * 60  },
  { id: 'u6',  name: 'Café del Barrio',     email: 'cafe@demo.com',   role: 'seller',       status: 'verified', joinedAt: Date.now() - 86400000 * 45  },
  { id: 'u7',  name: 'Luis Torres',         email: 'luis@demo.com',   role: 'buyer',        status: 'verified', joinedAt: Date.now() - 86400000 * 5   },
  { id: 'u8',  name: 'José Hernández',      email: 'jhern@demo.com',  role: 'driver',       status: 'pending',  joinedAt: Date.now() - 86400000 * 1   },
  { id: 'u9',  name: 'Admin LocalMarket',   email: 'admin@demo.com',  role: 'admin',        status: 'verified', joinedAt: Date.now() - 86400000 * 365 },
  { id: 'u10', name: 'Master Admin',        email: 'master@demo.com', role: 'master_admin', status: 'verified', joinedAt: Date.now() - 86400000 * 365 },
];

export const PERMISSIONS: Record<string, string[]> = {
  buyer:        ['view_products', 'cart', 'orders', 'tracking', 'chat', 'profile'],
  seller:       ['view_products', 'cart', 'orders', 'tracking', 'chat', 'profile', 'manage_products', 'view_sales', 'seller_dashboard'],
  driver:       ['tracking', 'chat', 'profile', 'driver_deliveries', 'driver_earnings', 'driver_dashboard'],
  admin:        ['*'],
  master_admin: ['*'],
};

export const CATEGORIES = [
  { key: 'todos',     label: 'Todos',      emoji: '🏪' },
  { key: 'panaderia', label: 'Panadería',  emoji: '🥖' },
  { key: 'alimentos', label: 'Alimentos',  emoji: '🥬' },
  { key: 'bebidas',   label: 'Bebidas',    emoji: '☕' },
  { key: 'artesanias',label: 'Artesanías', emoji: '🎨' },
  { key: 'otros',     label: 'Otros',      emoji: '📦' },
] as const;
