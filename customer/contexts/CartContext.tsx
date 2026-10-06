import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getCart, getAuthToken } from '../api/client';

type CartCtx = {
  count: number;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartCtx>({ count: 0, refresh: async () => {} });

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!getAuthToken()) { setCount(0); return; }
    try {
      const res = await getCart();
      const items = (res?.items as Array<{ quantity: number }>) || [];
      setCount(items.reduce((s, i) => s + (i.quantity || 1), 0));
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <CartContext.Provider value={{ count, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
