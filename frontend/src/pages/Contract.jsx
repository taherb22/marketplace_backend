import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, CheckCircle } from 'lucide-react';

export default function Contract() {
  const { profile, reloadProfile } = useAuth();
  const navigate = useNavigate();
  const [contractText, setContractText] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    // Redirect if already a seller
    if (profile?.seller_status === 'verified' || profile?.seller_status === 'pending') {
      navigate('/dashboard');
      return;
    }

    Promise.all([
      fetchApi('/contract'),
      fetchApi('/contract/status')
    ]).then(([contractData, statusData]) => {
      setContractText(contractData.text);
      setStatus(statusData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [profile, navigate]);

  const handleSign = async () => {
    setSigning(true);
    try {
      await fetchApi('/contract/sign', {
        method: 'POST',
        body: JSON.stringify({ agreed: true })
      });
      await reloadProfile();
      navigate('/dashboard');
    } catch (err) {
      alert(err.message);
      setSigning(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading contract...</div>;

  return (
    <div className="container" style={{ maxWidth: '800px', marginTop: '2rem' }}>
      <div className="glass-panel" style={{ padding: '3rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <FileText /> Seller Agreement
        </h1>

        {status?.signed ? (
          <div style={{ textAlign: 'center', color: 'var(--success)', padding: '2rem' }}>
            <CheckCircle size={48} style={{ marginBottom: '1rem' }} />
            <h2>You have already signed this contract.</h2>
            <p>Your seller account is active.</p>
          </div>
        ) : (
          <>
            <div style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: '1.5rem', 
              borderRadius: 'var(--border-radius)', 
              maxHeight: '400px', 
              overflowY: 'auto',
              marginBottom: '2rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              border: '1px solid var(--border-color)'
            }}>
              {contractText}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
               <button className="btn btn-primary" onClick={handleSign} disabled={signing} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
                 {signing ? 'Signing...' : 'I Agree & Register as Seller'}
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
