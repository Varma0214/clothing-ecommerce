import { createContext, useState, useEffect } from 'react';
export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cartItems'));
    if (stored) setCartItems(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, size, qty) => {
    const exist = cartItems.find(x => x.product === product._id && x.size === size);
    if (exist) {
      setCartItems(cartItems.map(x => x === exist ? { ...exist, qty: exist.qty + qty } : x));
    } else {
      setCartItems([...cartItems, { 
        product: product._id, name: product.name, image: product.image, 
        price: product.price, size, qty 
      }]);
    }
  };

  const removeFromCart = (pid, size) => setCartItems(cartItems.filter(x => !(x.product === pid && x.size === size)));
  const clearCart = () => setCartItems([]);

  return <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>{children}</CartContext.Provider>;
};