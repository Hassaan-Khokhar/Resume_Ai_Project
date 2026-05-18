import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../api';
import { Home, Brain, Briefcase, LogOut, Sparkles, Search, X, User, MapPin, Menu as MenuIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const timerRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); setMobileMenuOpen(false); };

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.length < 1) { setResults(null); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await usersAPI.globalSearch(val);
        setResults(res.data || res);
        setShowSearch(true);
      } catch (e) { console.error(e); }
    }, 200);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  const goToProfile = (id) => { setShowSearch(false); setQuery(''); navigate(`/profile/${id}`); setMobileMenuOpen(false); };
  const goToJob = (id) => { setShowSearch(false); setQuery(''); navigate(`/jobs?highlight=${id}`); setMobileMenuOpen(false); };
  const viewAll = () => { setShowSearch(false); navigate(`/search?q=${encodeURIComponent(query)}`); setMobileMenuOpen(false); };

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand"><Sparkles size={22} /> ResumeAI</NavLink>

        {/* Global Search */}
        <div className="search-container" ref={searchRef}>
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input className="search-input" placeholder="Search people, jobs..."
              value={query} onChange={e => handleSearch(e.target.value)}
              onFocus={() => results && setShowSearch(true)}
              onKeyDown={e => e.key === 'Enter' && viewAll()} />
            {query && <button className="search-clear" onClick={() => { setQuery(''); setResults(null); setShowSearch(false); }}><X size={14} /></button>}
          </div>

          {showSearch && results && (
            <div className="search-dropdown glass-card">
              {results.people?.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">People</div>
                  {results.people.slice(0, 4).map(p => (
                    <div key={p._id} className="search-item" onClick={() => goToProfile(p._id)}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', overflow: 'hidden' }}>
                        {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.headline || `@${p.username}`}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {results.jobs?.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">Jobs</div>
                  {results.jobs.slice(0, 3).map(j => (
                    <div key={j._id} className="search-item" onClick={() => goToJob(j._id)}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(108,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Briefcase size={16} color="var(--accent)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{j.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{j.company_name}{j.location ? ` · ${j.location}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="search-footer" onClick={viewAll}>
                <Search size={14} /> See all results for "{query}"
              </div>
            </div>
          )}
        </div>

        {/* Desktop Nav Links */}
        <div className="navbar-links navbar-links-desktop">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            <Home size={18} /><span>Feed</span>
          </NavLink>
          <NavLink to="/ai" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Brain size={18} /><span>AI Center</span>
          </NavLink>
          <NavLink to="/jobs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Briefcase size={18} /><span>Jobs</span>
          </NavLink>
        </div>

        <div className="nav-user">
          <div className="avatar" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => navigate(`/profile/${user?.id}`)}>
            {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.name?.[0]?.toUpperCase()}
          </div>
          <button className="btn-ghost desktop-only" onClick={handleLogout}><LogOut size={16} /></button>
          {/* Mobile Hamburger */}
          <button className="btn-ghost mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Out Menu */}
      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <div className="avatar" style={{ width: 48, height: 48, fontSize: '1.2rem', overflow: 'hidden' }}
            onClick={() => { navigate(`/profile/${user?.id}`); setMobileMenuOpen(false); }}>
            {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.headline || user?.email}</div>
          </div>
        </div>
        <NavLink to="/" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
          <Home size={20} /> Feed
        </NavLink>
        <NavLink to="/ai" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
          <Brain size={20} /> AI Center
        </NavLink>
        <NavLink to="/jobs" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
          <Briefcase size={20} /> Jobs
        </NavLink>
        <NavLink to={`/profile/${user?.id}`} className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
          <User size={20} /> My Profile
        </NavLink>
        <div className="mobile-menu-divider" />
        <button className="mobile-menu-link" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
          <LogOut size={20} /> Sign Out
        </button>
      </div>
    </>
  );
}
