import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Package, ShoppingCart, Activity } from 'lucide-react';

export default function Admin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('queue');

  const [queue, setQueue] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [sellersPending, setSellersPending] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    if (activeTab === 'queue') loadQueue();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'sellers') loadSellersPending();
    if (activeTab === 'stats') loadStats();
  }, [profile, activeTab]);

  const loadQueue = async () => {
    const data = await fetchApi('/admin/products/queue');
    setQueue(data.products || []);
  };
  const loadOrders = async () => {
    const data = await fetchApi('/orders/admin/all');
    setOrders(data.orders || []);
  };
  const loadUsers = async () => {
    const data = await fetchApi('/admin/users');
    setUsers(data.users || []);
  };
  const loadSellersPending = async () => {
    const data = await fetchApi('/admin/sellers/pending');
    setSellersPending(data.applications || []);
  };
  const loadStats = async () => setStats(await fetchApi('/admin/stats'));

  const handleSellerAction = async (userId, action) => {
    try {
      if (action === 'approve') {
        await fetchApi(`/admin/sellers/${userId}/approve`, { method: 'POST' });
      } else {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        await fetchApi(`/admin/sellers/${userId}/reject`, { 
          method: 'POST', 
          body: JSON.stringify({ reason }) 
        });
      }
      loadSellersPending();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleProductAction = async (id, action) => {
    try {
      if (action === 'approve') {
        await fetchApi(`/admin/products/${id}/approve`, { method: 'POST' });
      } else {
        const note = prompt('Rejection reason:');
        if (!note) return;
        await fetchApi(`/admin/products/${id}/reject`, { 
          method: 'POST', 
          body: JSON.stringify({ note }) 
        });
      }
      loadQueue();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleAdmin = async (id) => {
    try {
      await fetchApi(`/admin/users/${id}/toggle-admin`, { method: 'PUT' });
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!profile?.is_admin) return null;

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Shield /> System Administration
      </h1>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Sidebar */}
        <div className="glass-panel" style={{ width: '250px', padding: '1rem', height: 'fit-content' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className={`btn ${activeTab === 'queue' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('queue')}>
              <Package size={18} /> Product Queue
            </button>
            <button className={`btn ${activeTab === 'orders' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('orders')}>
              <ShoppingCart size={18} /> All Orders
            </button>
            <button className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('users')}>
              <Users size={18} /> Users
            </button>
            <button className={`btn ${activeTab === 'sellers' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('sellers')}>
              <Shield size={18} /> Seller Requests
            </button>
            <button className={`btn ${activeTab === 'stats' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('stats')}>
              <Activity size={18} /> Platform Stats
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem' }}>
          {activeTab === 'queue' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>Pending Products</h2>
              {queue.length === 0 ? <p>No products waiting for review.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {queue.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--border-radius-sm)' }}>
                      <div>
                        <h3>{p.title} <span style={{ fontSize: '1rem', color: 'var(--accent-secondary)' }}>${p.price}</span></h3>
                        <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>{p.description}</p>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Stock: {p.stock} | Seller ID: {p.seller_id.substring(0,8)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button className="btn btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleProductAction(p.id, 'approve')}>Approve</button>
                        <button className="btn btn-danger" onClick={() => handleProductAction(p.id, 'reject')}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>All Global Orders</h2>
              {orders.length === 0 ? <p>No orders yet.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>ID</th>
                      <th style={{ padding: '0.5rem' }}>Buyer</th>
                      <th style={{ padding: '0.5rem' }}>Total</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.5rem' }}>{o.id.substring(0,8)}</td>
                        <td style={{ padding: '0.5rem' }}>{o.buyer_name}</td>
                        <td style={{ padding: '0.5rem' }}>${o.total_amount}</td>
                        <td style={{ padding: '0.5rem' }}>{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>User Directory</h2>
              {users.length === 0 ? <p>Loading users...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Name</th>
                      <th style={{ padding: '0.5rem' }}>Roles</th>
                      <th style={{ padding: '0.5rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.5rem' }}>{u.name || '(No name)'} <br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.id.substring(0,8)}</span></td>
                        <td style={{ padding: '0.5rem' }}>
                          {u.is_admin && <span style={{ color: 'var(--warning)', marginRight: '0.5rem' }}>Admin</span>}
                          {u.seller_status === 'verified' && <span style={{ color: 'var(--accent-secondary)' }}>Seller</span>}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <button 
                            className={u.is_admin ? "btn btn-danger" : "btn"} 
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} 
                            onClick={() => toggleAdmin(u.id)}
                            disabled={u.id === profile.id}
                            title={u.id === profile.id ? "You cannot modify your own admin status" : ""}
                          >
                            {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'sellers' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>Pending Seller Applications</h2>
              {sellersPending.length === 0 ? <p>No applications waiting for review.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {sellersPending.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--border-radius-sm)' }}>
                      <div>
                        <h3>User ID: {a.user_id.substring(0,8)}</h3>
                        <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>Note: {a.note || 'None'}</p>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Applied: {new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button className="btn btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleSellerAction(a.user_id, 'approve')}>Approve</button>
                        <button className="btn btn-danger" onClick={() => handleSellerAction(a.user_id, 'reject')}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && stats && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>Platform Stats</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '2rem', color: 'var(--accent-primary)' }}>{stats.users_count}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Total Users</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '2rem', color: 'var(--accent-secondary)' }}>{stats.products_count}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Active Products</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '2rem', color: 'var(--warning)' }}>{stats.orders_count}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Total Orders</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '2rem', color: 'var(--success)' }}>${stats.total_revenue || 0}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Total Revenue</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
