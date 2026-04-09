import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetails from './pages/ProductDetails';
import CheckoutModal from './components/CheckoutModal';
import Dashboard from './pages/Dashboard';
import Contract from './pages/Contract';
import Admin from './pages/Admin';
// Additional pages to be implemented
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="products/:id" element={<ProductDetails />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contract" element={<Contract />} />
          <Route path="admin" element={<Admin />} />
          {/* Default 404 */}
          <Route path="*" element={<div style={{ textAlign: 'center', padding: '4rem' }}>404 Not Found</div>} />
        </Route>
      </Routes>
      <CheckoutModal />
    </>
  );
}

export default App;
