import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import { ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchApi('/products');
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', margin: '4rem 0' }}>
        <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>{t('home.hero.title')}</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          {t('home.hero.subtitle')}
        </p>
      </div>

      {loading && <div style={{ textAlign: 'center' }}>Loading products...</div>}
      
      {error && (
        <div style={{ textAlign: 'center', color: 'var(--danger)', padding: '2rem' }}>
          Error loading products: {error}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '2rem',
        marginTop: '2rem'
      }}>
        {!loading && products.length === 0 && !error && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>
            No products available yet. Check back soon!
          </div>
        )}

        {products.map(product => (
          <div key={product.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate(`/products/${product.id}`)}>
            {/* Image Placeholder */}
            <div style={{ height: '200px', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('product.no_image')}</span>
            </div>
            
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{product.title}</h3>
                <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold', fontSize: '1.25rem' }}>${product.price}</span>
              </div>
              
              <p style={{ fontSize: '0.875rem', flex: 1, color: 'var(--text-secondary)' }}>
                {product.description?.substring(0, 100)}{product.description && product.description.length > 100 ? '...' : ''}
              </p>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('product.stock')}: {product.stock}</span>
                <button 
                   className="btn btn-primary" 
                   style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                   onClick={() => addToCart(product)}
                   disabled={product.stock <= 0}
                >
                  <ShoppingCart size={16} /> {product.stock > 0 ? t('product.add_to_cart') : t('product.sold_out')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
