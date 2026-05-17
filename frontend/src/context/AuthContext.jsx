import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      try { 
        setUser(JSON.parse(stored));
        // Refresh fresh data from server
        fetch('http://localhost:8000/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            const freshUser = { ...res.data, id: res.data._id };
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          }
        }).catch(err => console.error("Refresh failed", err));
      } catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // Immediately fetch full profile for fresh state (including experience/location)
    fetch('http://localhost:8000/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        const freshUser = { ...res.data, id: res.data._id };
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      }
    }).catch(err => console.error("Initial sync failed", err));
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
