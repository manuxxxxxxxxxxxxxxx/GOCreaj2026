export type UserRole = 'buyer' | 'seller' | 'driver' | 'admin' | 'master_admin';
export type UserStatus = 'pending' | 'verified' | 'banned';
export type OrderStatus = 'confirmado' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
export type DeliveryStatus = 'buscando' | 'asignado' | 'recogido' | 'entregado';
export type ProductCategory = 'panaderia' | 'alimentos' | 'bebidas' | 'artesanias' | 'otros';
export type VehicleType = 'moto' | 'bici' | 'carro' | 'scooter';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  bio?: string;
  avatar?: string | null;
  role: UserRole;
  status: UserStatus;
  joinedAt: number;
}

export interface SellerProfile {
  storeName: string;
  description?: string;
  category?: ProductCategory;
  rating: number;
  verified: boolean;
  commissionRate: number;
}

export interface DriverProfile {
  vehicleType: VehicleType;
  vehicle: string;
  rating: number;
  verified: boolean;
  totalDeliveries: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  emoji: string;
  cat: ProductCategory;
  seller: string;
  description?: string;
  image?: string;
  stock?: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  prepTime?: string;
  distance?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface Coupon {
  type: 'percent' | 'shipping';
  value: number;
  label: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  emoji: string;
}

export interface Order {
  id: string;
  savedAt: number;
  items: OrderItem[];
  total: number;
  shipping: string;
  payment: string;
  address: string;
  status: OrderStatus;
  driver: Driver | null;
  deliveryOrderId: string | null;
}

export interface Driver {
  name: string;
  rating: number;
  reviews: number;
  vehicle: string;
  vehicleType: VehicleType;
  initials: string;
  avatar: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  timestamp: number;
  read: boolean;
  imageUrl?: string;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'vendedor' | 'repartidor' | 'soporte';
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  avatar?: string;
  initials: string;
}

export interface Delivery {
  orderId: string;
  status: DeliveryStatus;
  driver: Driver | null;
  estimatedTime?: string;
  steps: DeliveryStep[];
}

export interface DeliveryStep {
  label: string;
  done: boolean;
  time?: string;
}

export interface Notification {
  id: string;
  type: 'new_order' | 'order_status' | 'delivery_assigned' | 'general';
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
}

export interface SellerStats {
  totalRevenue: number;
  todayOrders: number;
  rating: number;
  topProducts: { name: string; sales: number }[];
}

export interface DriverStats {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalDeliveries: number;
  avgTime: string;
  rating: number;
}

export interface AdminStats {
  platformRevenue: number;
  totalUsers: number;
  pendingVerifications: number;
  usersByRole: Record<UserRole, number>;
}

export interface Reel {
  id: number;
  author: string;
  handle: string;
  verified: boolean;
  description: string;
  music: string;
  distance: string;
  likes: number;
  comments: number;
  product?: {
    name: string;
    price: number;
    emoji: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  code?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
