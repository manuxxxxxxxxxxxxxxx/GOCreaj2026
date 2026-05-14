import api from './apiClient';
import { CATALOG } from '../data/catalog';
import type { Product, ProductCategory } from '../types';

export async function getProducts(
  category?: ProductCategory | 'todos',
  search?: string
): Promise<Product[]> {
  try {
    const params: Record<string, string> = {};
    if (category && category !== 'todos') params.category = category;
    if (search) params.search = search;
    const res = await api.get('/products', { params });
    return res.data.products ?? res.data;
  } catch {
    let results = [...CATALOG];
    if (category && category !== 'todos') {
      results = results.filter((p) => p.cat === category);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (p) => p.name.toLowerCase().includes(q) || p.seller.toLowerCase().includes(q)
      );
    }
    return results;
  }
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<Product | null> {
  try {
    const res = await api.post('/products', data);
    return res.data;
  } catch {
    return null;
  }
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<boolean> {
  try {
    await api.patch(`/products/${id}`, data);
    return true;
  } catch {
    return false;
  }
}

export async function deleteProduct(id: number): Promise<boolean> {
  try {
    await api.delete(`/products/${id}`);
    return true;
  } catch {
    return false;
  }
}
