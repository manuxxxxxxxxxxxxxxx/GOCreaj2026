import api from './apiClient';
import { CATEGORIES } from '../data/catalog';
import type { Category } from '../types';

export type CategoryItem = {
  key: string;
  label: string;
  emoji: string;
};

const TODOS_ITEM: CategoryItem = { key: 'todos', label: 'Todos', emoji: '🏪' };

export async function getCategories(): Promise<CategoryItem[]> {
  try {
    const res = await api.get('/categories');
    const remote: CategoryItem[] = (res.data as Category[]).map((c) => ({
      key:   c.slug,
      label: c.name,
      emoji: c.emoji,
    }));
    return [TODOS_ITEM, ...remote];
  } catch {
    return [...CATEGORIES] as CategoryItem[];
  }
}
