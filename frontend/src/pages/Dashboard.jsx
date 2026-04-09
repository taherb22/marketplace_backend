import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Package, ShoppingCart, Settings } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');

  // Seller states
  const [myProducts, setMyProducts] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);

  // New product form
  const [newProduct, setNewProduct] = useState({ title: '', description: '', price: '', stock: '' });

  useEffect(() => {
    if (!profile) return;
    if (profile.seller_status === 'verified' && activeTab === 'products') loadProducts();
    if (profile.seller_status === 'verified' && activeTab === 'orders') loadSellerOrders();
  }, [profile, activeTab]);

  const loadProducts = async () => {
    const data = await fetchApi('/products/mine');
    setMyProducts(data.products || []);
  };

  const loadSellerOrders = async () => {
    const data = await fetchApi('/orders/seller');
    setSellerOrders(data.orders || []);
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify({
          title: newProduct.title,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          stock: parseInt(newProduct.stock)
        })
      });
      setNewProduct({ title: '', description: '', price: '', stock: '' });
      setActiveTab('products');
      alert('Product submitted for review!');
    } catch (err) {
      alert(err.message);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      loadSellerOrders();
    } catch (err) {
      // It might be pending_confirmation so needs /confirm instead
      if (err.message.includes('pending_confirmation') || status === 'confirmed') {
        try {
          await fetchApi(`/orders/${orderId}/confirm`, { method: 'POST' });
          loadSellerOrders();
        } catch (e) {
          alert(e.message);
        }
      } else {
        alert(err.message);
      }
    }
  };

  if (!profile) return null; // Loaded but null handled by Route

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>My Dashboard</h1>
        {profile.is_admin && (
          <Link to="/admin" className="btn btn-primary" style={{ background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }}>
            Admin Panel
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Sidebar */}
        <div className="glass-panel" style={{ width: '250px', padding: '1rem', height: 'fit-content' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className={`btn ${activeTab === 'orders' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('orders')}>
              <ShoppingCart size={18} /> My Sales
            </button>
            <button className={`btn ${activeTab === 'products' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('products')}>
              <Package size={18} /> My Products
            </button>
            <button className={`btn ${activeTab === 'add' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('add')}>
              <PlusCircle size={18} /> Add Product
            </button>
            <button className={`btn ${activeTab === 'settings' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('settings')}>
              <Settings size={18} /> Settings
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem' }}>
          {profile.seller_status !== 'verified' && activeTab !== 'settings' ? (
             <div style={{ textAlign: 'center', padding: '4rem 0' }}>
               {profile.seller_status === 'pending' ? (
                 <>
                   <h2>Application Under Review</h2>
                   <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                     Your seller application is currently pending admin approval. You will be able to list products soon!
                   </p>
                 </>
               ) : profile.seller_status === 'rejected' ? (
                 <>
                   <h2>Application Rejected</h2>
                   <p style={{ color: 'var(--danger)', marginBottom: '1.5rem' }}>
                     Your seller application was not approved. Please contact support.
                   </p>
                 </>
               ) : (
                 <>
                   <h2>You are not a verified seller yet.</h2>
                   <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                     Sign our seller agreement to start listing your products on Dream Marketplace.
                   </p>
                   <button className="btn btn-primary" onClick={() => navigate('/contract')}>Sign Contract</button>
                 </>
               )}
             </div>
          ) : (
            <>
              {activeTab === 'products' && (
                <div>
                  <h2 style={{ marginBottom: '1.5rem' }}>My Products</h2>
                  {myProducts.length === 0 ? <p>No products found.</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '1rem' }}>Title</th>
                          <th style={{ padding: '1rem' }}>Price</th>
                          <th style={{ padding: '1rem' }}>Stock</th>
                          <th style={{ padding: '1rem' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myProducts.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '1rem' }}>{p.title}</td>
                            <td style={{ padding: '1rem' }}>${p.price}</td>
                            <td style={{ padding: '1rem' }}>{p.stock}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ 
                                background: p.review_status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : p.review_status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: p.review_status === 'approved' ? 'var(--success)' : p.review_status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
                                padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.875rem', display: 'inline-block'
                              }}>
                                {p.review_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h2 style={{ marginBottom: '1.5rem' }}>Recent Orders</h2>
                  {sellerOrders.length === 0 ? <p>No orders found.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {sellerOrders.map(order => {
                        const orderId = order.order_id || order.id;
                        return (
                        <div key={orderId} style={{ background: 'rgba(0,0,0,0.05)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div>
                              <strong>Order #{orderId?.substring(0,8)}</strong>
                              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status: {order.status?.toUpperCase()}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {order.status === 'pending_confirmation' && (
                                <button className="btn btn-primary" onClick={() => updateOrderStatus(orderId, 'confirmed')}>Confirm</button>
                              )}
                              {order.status === 'confirmed' && (
                                <button className="btn btn-primary" onClick={() => updateOrderStatus(orderId, 'shipped')}>Mark Shipped</button>
                              )}
                            </div>
                          </div>
                          <div>
                            {(order.my_items || order.items || []).map(item => (
                              <div key={item.product_id || item.id} style={{ fontSize: '0.875rem' }}>
                                {item.quantity}x — {item.snapshot?.title || item.title || 'Product'}
                              </div>
                            ))}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'add' && (
                <div style={{ maxWidth: '500px' }}>
                  <h2 style={{ marginBottom: '1.5rem' }}>Submit New Product</h2>
                  <form onSubmit={submitProduct}>
                    <div className="form-group">
                      <label className="form-label">Title</label>
                      <input type="text" className="form-input" required value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="form-input" rows={4} required value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price ($)</label>
                      <input type="number" step="0.01" className="form-input" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Initial Stock</label>
                      <input type="number" className="form-input" required value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Submit for Review</button>
                  </form>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 style={{ marginBottom: '1.5rem' }}>Account Settings</h2>
                  <p><strong>Name:</strong> {profile.name || 'Not set'}</p>
                  <p>
                    <strong>Seller Status:</strong>{' '}
                    {profile.seller_status === 'verified' ? <span style={{ color: 'var(--success)' }}>Verified</span> :
                     profile.seller_status === 'pending' ? <span style={{ color: 'var(--warning)' }}>Pending Review</span> :
                     profile.seller_status === 'rejected' ? <span style={{ color: 'var(--danger)' }}>Rejected</span> :
                     'Not a seller'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
