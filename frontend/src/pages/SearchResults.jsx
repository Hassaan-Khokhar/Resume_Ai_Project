import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usersAPI } from '../api';
import { User, Briefcase, MapPin, Search as SearchIcon, Loader2 } from 'lucide-react';

export default function SearchResults({ addToast }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [results, setResults] = useState({ people: [], jobs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await usersAPI.globalSearch(query);
        setResults(res.data || res); // Handle both formats
      } catch (e) {
        addToast('Search failed', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (query) fetchResults();
  }, [query]);

  if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: 100 }}><Loader2 className="spin" /></div>;

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
          <SearchIcon size={24} /> Search Results for "{query}"
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          Found {results.people?.length || 0} people and {results.jobs?.length || 0} jobs
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* People Column */}
        <div>
          <h2 className="section-title" style={{ marginBottom: 16 }}><User size={18} /> People</h2>
          {results.people?.length === 0 ? (
            <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No people found</div>
          ) : (
            results.people.map(p => (
              <div key={p._id} className="glass-card" style={{ padding: 16, marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${p._id}`)}>
                <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.4rem', overflow: 'hidden' }}>
                  {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.headline}</div>
                  {p.location && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}><MapPin size={12} /> {p.location}</div>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Jobs Column */}
        <div>
          <h2 className="section-title" style={{ marginBottom: 16 }}><Briefcase size={18} /> Jobs</h2>
          {results.jobs?.length === 0 ? (
            <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No jobs found</div>
          ) : (
            results.jobs.map(j => (
              <div key={j._id} className="glass-card" style={{ padding: 16, marginBottom: 12, cursor: 'pointer' }}
                onClick={() => navigate('/jobs')}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent)' }}>{j.title}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, margin: '4px 0' }}>{j.company_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{j.job_type} • {j.location}</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {j.description}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
