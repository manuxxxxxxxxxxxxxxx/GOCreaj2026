import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Product } from '../../types';

interface CartState {
  items: CartItem[];
}

const initialState: CartState = { items: [] };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<{ product: Product; qty?: number }>) {
      const { product, qty = 1 } = action.payload;
      const idx = state.items.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        state.items[idx].qty += qty;
      } else {
        state.items.push({ product, qty });
      }
    },
    removeItem(state, action: PayloadAction<number>) {
      state.items = state.items.filter((i) => i.product.id !== action.payload);
    },
    updateQty(state, action: PayloadAction<{ productId: number; qty: number }>) {
      const { productId, qty } = action.payload;
      if (qty <= 0) {
        state.items = state.items.filter((i) => i.product.id !== productId);
      } else {
        const idx = state.items.findIndex((i) => i.product.id === productId);
        if (idx >= 0) state.items[idx].qty = qty;
      }
    },
    clearCart(state) {
      state.items = [];
    },
    setItems(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
    },
  },
});

export const { addItem, removeItem, updateQty, clearCart, setItems } = cartSlice.actions;

export const selectCartCount   = (state: { cart: CartState }) => state.cart.items.reduce((s, i) => s + i.qty, 0);
export const selectCartSubtotal = (state: { cart: CartState }) => state.cart.items.reduce((s, i) => s + i.product.price * i.qty, 0);

export default cartSlice.reducer;
