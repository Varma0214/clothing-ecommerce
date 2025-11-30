import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Cart.css';

export default function Cart() {
  const { cartItems, removeFromCart, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const total = cartItems.reduce((acc, item) => acc + item.qty * item.price, 0);

  const handleCheckout = async () => {
    if (!user) return navigate('/login');
    try {
      await API.post('/orders', { orderItems: cartItems, totalPrice: total });
      alert('Order Placed! Check your email.');
      clearCart();
      navigate('/');
    } catch (error) { alert('Failed to place order.'); }
  };

  if (cartItems.length === 0) return <div className="empty-cart">Your cart is empty.</div>;

  return (
    <div className="cart-container">
      <h1>Shopping Cart</h1>
      <div className="cart-content">
        <div className="cart-items">
          {cartItems.map(item => (
            <div key={`${item.product}-${item.size}`} className="cart-item">
              <img src={item.image} alt={item.name} />
              <div className="item-details">
                <h3>{item.name}</h3>
                <p>Size: {item.size}</p>
                <p className="item-price">${item.price} x {item.qty}</p>
              </div>
              <button className="remove-btn" onClick={() => removeFromCart(item.product, item.size)}>
                &times;
              </button>
            </div>
          ))}
        </div>
        
        <div className="cart-summary">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button onClick={handleCheckout} className="checkout-btn">Proceed to Checkout</button>
        </div>
      </div>
    </div>
  );
}