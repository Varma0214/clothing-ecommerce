import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { cartItems } = useContext(CartContext);
  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo">CLOTHIER</Link>
        <div className="nav-links">
          <Link to="/" className="nav-item">Shop</Link>
          <Link to="/cart" className="nav-item cart-link">
            Cart <span className="cart-badge">{cartCount}</span>
          </Link>
          {user ? (
            <div className="user-menu">
              <span className="user-name">Hi, {user.name}</span>
              <button onClick={logout} className="logout-btn">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="nav-item">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}