import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import { ShoppingBag, User, LogOut, LogIn, PlusCircle, ShoppingCart, Shield, Globe } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { cartItems, setIsCartOpen } = useCart();
  const { lang, setLang, t } = useTranslation();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0 }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--text-primary)' }}>
          <img src="/logo.png" alt="Dream Marketplace Logo" style={{ height: '42px', width: '42px', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--accent-primary)', boxShadow: '0 2px 8px rgba(194,24,43,0.2)' }} />
          <h2 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>Dream Marketplace</h2>
        </Link>
        
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <>
              {!profile?.is_admin && (
                profile?.seller_status === 'verified' ? (
                  <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                    <PlusCircle size={16} /> {t('nav.sell_item')}
                  </Link>
                ) : profile?.seller_status === 'pending' ? (
                  <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', opacity: 0.7 }} disabled>
                    {t('nav.pending')}
                  </button>
                ) : (
                  <Link to="/contract" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                    {t('nav.seller')}
                  </Link>
                )
              )}
              {profile?.is_admin && (
                <Link to="/admin" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                  <Shield size={16} /> {t('nav.admin')}
                </Link>
              )}
              <Link to="/dashboard" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                <User size={16} /> {t('nav.dashboard')}
              </Link>
              <button onClick={handleLogout} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                <LogOut size={16} /> {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                <LogIn size={16} /> {t('nav.login')}
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                {t('nav.signup')}
              </Link>
            </>
          )}

          {user && !profile?.is_admin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <button className="btn" style={{ position: 'relative', padding: '0.4rem 0.8rem' }} onClick={() => setIsCartOpen(true)}>
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-primary)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
            <Globe size={16} color="var(--text-secondary)" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="en" style={{ color: '#000' }}>EN</option>
              <option value="fr" style={{ color: '#000' }}>FR</option>
              <option value="ar" style={{ color: '#000' }}>AR</option>
            </select>
          </div>
        </nav>
      </div>
    </header>
  );
}
