import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { ArrowLeft, ShoppingCart, Info } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/products/${id}`);
      setProduct(data.product || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', margin: '4rem 0' }}>Loading details...</div>;
  if (error || !product) return (
    <div style={{ textAlign: 'center', color: 'var(--danger)', margin: '4rem 0' }}>
      Error: {error || 'Product not found'}
      <br />
      <button className="btn" style={{ marginTop: '1rem' }} onClick={() => navigate('/')}>Back to Home</button>
    </div>
  );

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <button className="btn" style={{ marginBottom: '2rem' }} onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
        <div style={{ flex: '1 1 400px', minHeight: '400px', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <span style={{ color: 'var(--text-muted)', fontSize: '1.5rem' }}>Image coming soon</span>
        </div>
        
        <div style={{ flex: '1 1 400px', padding: '3rem', display: 'flex', flexDirection: 'column' }}>
           <h1 style={{ marginBottom: '0.5rem' }}>{product.title}</h1>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
             <span style={{ color: 'var(--accent-secondary)', fontSize: '2rem', fontWeight: 'bold' }}>
               ${product.price}
             </span>
             {product.stock > 0 ? (
               <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                 In Stock ({product.stock})
               </span>
             ) : (
               <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                 Out of Stock
               </span>
             )}
           </div>

           <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-secondary)', flex: 1 }}>
             {product.description}
           </p>

           <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <button 
                className="btn btn-primary" 
                style={{ padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
             >
               <ShoppingCart /> {product.stock > 0 ? 'Add to Cart' : 'Sold Out'}
             </button>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', justifyContent: 'center' }}>
               <Info size={14} /> Sold by verified Dream Marketplace seller
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
