import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { CartContext } from '../context/CartContext';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [size, setSize] = useState('');
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    API.get(`/products/${id}`).then(res => setProduct(res.data));
  }, [id]);

  const handleAddToCart = () => {
    if (!size) { alert('Please select a size'); return; }
    addToCart(product, size, 1);
    navigate('/cart');
  };

  if (!product) return <div className="loading">Loading...</div>;

  return (
    <div className="detail-container">
      <div className="detail-image">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="detail-info">
        <span className="category-tag">{product.category}</span>
        <h1>{product.name}</h1>
        <h2 className="detail-price">${product.price}</h2>
        <p className="description">{product.description}</p>
        
        <div className="size-selector">
          <h3>Select Size:</h3>
          <div className="sizes">
            {product.sizes.map(s => (
              <button 
                key={s} 
                className={`size-btn ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleAddToCart} className="add-cart-btn">
          Add to Cart
        </button>
      </div>
    </div>
  );
}