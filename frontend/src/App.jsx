import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import AICenter from './pages/AICenter';
import Jobs from './pages/Jobs';
import SearchResults from './pages/SearchResults';
import Profile from './pages/Profile';
import Toast from './components/Toast';
import { useState } from 'react';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login addToast={addToast} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register addToast={addToast} />} />
        <Route path="/" element={<ProtectedRoute><Feed addToast={addToast} /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><AICenter addToast={addToast} /></ProtectedRoute>} />
        <Route path="/jobs" element={<ProtectedRoute><Jobs addToast={addToast} /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchResults addToast={addToast} /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute><Profile addToast={addToast} /></ProtectedRoute>} />
      </Routes>
      <Toast toasts={toasts} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
