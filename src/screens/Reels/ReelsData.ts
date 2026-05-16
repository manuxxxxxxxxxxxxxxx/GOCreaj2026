// src/screens/Reels/ReelsData.ts

export interface ReelItem {
  id: number;
  bg: string;
  avatar: string;
  author: string;
  authorName: string;
  verified: boolean;
  desc: string;
  music: string;
  likes: string;
  comments: string;
  shares: string;
  distance: string;
  product: string;
  price: string;
  productImg: string;
  color: string;
}

export const REELS: ReelItem[] = [
  { 
    id: 1, 
    bg: 'https://images.unsplash.com/photo-1615312090659-f1da3fd2d85b?auto=format&fit=crop&w=800&q=80', 
    avatar: 'https://images.unsplash.com/photo-1767327142296-c4999b0aadb9?auto=format&fit=crop&w=100&q=80', 
    author: '@TacosElCompa', authorName: 'Tacos El Compa', verified: true, 
    desc: '¡Saliendo la birria caliente del comal! 🔥 Ven hoy antes de que se acaben.', 
    music: 'Banda El Recodo • Corrido Clásico', likes: '12.4k', comments: '340', shares: '89', 
    distance: '1.2 km', product: 'Orden de Birria x3', price: '$85.00', 
    productImg: 'https://images.unsplash.com/photo-1726514733212-0d99c0e2f1f4?auto=format&fit=crop&w=80&q=80', color: '#f97316' 
  },
  // ... Agrega los demás aquí
];