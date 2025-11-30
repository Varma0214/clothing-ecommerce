import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import './Home.css';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ category: '', minPrice: '', maxPrice: '', keyword: '' });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let query = `?page=${page}&limit=9`;
        if (filters.category) query += `&category=${filters.category}`;
        if (filters.keyword) query += `&keyword=${filters.keyword}`;
        if (filters.minPrice) query += `&minPrice=${filters.minPrice}`;
        if (filters.maxPrice) query += `&maxPrice=${filters.maxPrice}`;

        console.log("Requesting:", query); 
        const { data } = await API.get(`/products${query}`);
        setProducts(data.products);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchProducts();
  }, [page, filters]);

  // --- NEW: Function to trigger the database seed from the UI ---
  const handleSeed = async () => {
    try {
      await API.get('/seed-now');
      alert("Database populated! The page will now refresh.");
      window.location.reload();
    } catch (err) {
      alert("Failed to seed database. Is the backend running?");
    }
  };

  const handleFilter = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  return (
    <div className="home-container">
      <div className="filters-sidebar">
        <h3>Filters</h3>
        <input name="keyword" placeholder="Search..." onChange={handleFilter} className="search-input" />
        <select name="category" onChange={handleFilter}>
          <option value="">All</option>
          <option value="Men">Men</option>
          <option value="Women">Women</option>
          <option value="Kids">Kids</option>
        </select>
        <div className="price-inputs">
           <input name="minPrice" placeholder="Min" type="number" onChange={handleFilter} />
           <input name="maxPrice" placeholder="Max" type="number" onChange={handleFilter} />
        </div>
      </div>

      <div className="product-grid-section">
        {/* --- NEW: Show a button if list is empty --- */}
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
             <h2>No products found.</h2>
             <p>Your database seems empty.</p>
             <button 
                onClick={handleSeed}
                style={{
                  background: 'blue', 
                  color: 'white', 
                  padding: '10px 20px', 
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: '5px',
                  marginTop: '10px'
                }}
             >
                Click here to Populate Database
             </button>
          </div>
        ) : null}

        <div className="product-grid">
          {products.map(p => (
            <div key={p._id} className="product-card">
              <img src={p.image} alt={p.name} style={{width: '100%', height: '200px', objectFit: 'cover'}} />
              <div className="card-details">
                <h4>{p.name}</h4>
                <p>${p.price}</p>
                <Link to={`/product/${p._id}`} className="view-btn">View</Link>
              </div>
            </div>
          ))}
        </div>
        
        {products.length > 0 && (
          <div className="pagination">
             <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
             <span>{page} / {totalPages}</span>
             <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}