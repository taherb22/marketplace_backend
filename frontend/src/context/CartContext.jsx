import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from localStorage when user changes
  useEffect(() => {
    const key = user ? `marketplace-cart-${user.id}` : 'marketplace-cart-guest';
    const saved = localStorage.getItem(key);
    setCartItems(saved ? JSON.parse(saved) : []);
  }, [user]);

  // Save to localStorage when cart changes
  useEffect(() => {
    const key = user ? `marketplace-cart-${user.id}` : 'marketplace-cart-guest';
    localStorage.setItem(key, JSON.stringify(cartItems));
  }, [cartItems, user]);

  // Close cart (and reset its state) when user logs out
  useEffect(() => {
    if (!user) {
      setIsCartOpen(false);
    }
  }, [user]);

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product_id: product.id, title: product.title, price: product.price, quantity: 1, stock: product.stock }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQ = item.quantity + delta;
        if (newQ > 0 && newQ <= item.stock) {
          return { ...item, quantity: newQ };
        }
        return item;
      }
      return item;
    }));
  };

  const clearCart = () => setCartItems([]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isCartOpen,
    setIsCartOpen,
    cartTotal: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
