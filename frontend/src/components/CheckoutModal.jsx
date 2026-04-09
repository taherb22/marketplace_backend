import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';
import { useTranslation } from '../context/LanguageContext';
import { X, Minus, Plus, ShoppingBag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutModal() {
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ buyer_name: '', buyer_address: '', buyer_phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Reset success state whenever cart is reopened
  useEffect(() => {
    if (isCartOpen) setSuccess(false);
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      setIsCartOpen(false);
      navigate('/login');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cartItems.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
          ...formData
        })
      });
      setSuccess(true);
      clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
        <button 
          onClick={() => setIsCartOpen(false)} 
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <ShoppingBag /> {t('cart.title')}
        </h2>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ color: 'var(--success)', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h3>{t('checkout.success')}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{t('checkout.success_sub')}</p>
            <button className="btn btn-primary" onClick={() => setIsCartOpen(false)} style={{ marginTop: '1rem' }}>{t('cart.close')}</button>
          </div>
        ) : cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            {t('cart.empty')}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {cartItems.map(item => (
                <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--border-radius-sm)' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{item.title}</h4>
                    <span style={{ color: 'var(--accent-secondary)' }}>${item.price}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="btn" style={{ padding: '0.2rem' }} onClick={() => updateQuantity(item.product_id, -1)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button className="btn" style={{ padding: '0.2rem' }} onClick={() => updateQuantity(item.product_id, 1)} disabled={item.quantity >= item.stock}><Plus size={14} /></button>
                    <button className="btn btn-danger" style={{ padding: '0.2rem', marginLeft: '0.5rem' }} onClick={() => removeFromCart(item.product_id)}><X size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              <span>{t('cart.total')}:</span>
              <span style={{ color: 'var(--accent-secondary)' }}>${cartTotal.toFixed(2)}</span>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {!user ? (
               <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setIsCartOpen(false); navigate('/login'); }}>
                 Login to Checkout
               </button>
            ) : (
              <form onSubmit={handleCheckout}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>{t('checkout.shipping')}</h3>
                <div className="form-group">
                  <input type="text" className="form-input" placeholder={t('checkout.name')} required value={formData.buyer_name} onChange={e => setFormData({...formData, buyer_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <input type="text" className="form-input" placeholder={t('checkout.address')} required value={formData.buyer_address} onChange={e => setFormData({...formData, buyer_address: e.target.value})} />
                </div>
                <div className="form-group">
                  <input type="tel" className="form-input" placeholder={t('checkout.phone')} required value={formData.buyer_phone} onChange={e => setFormData({...formData, buyer_phone: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : `${t('checkout.place_order')} ($${cartTotal.toFixed(2)})`}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
