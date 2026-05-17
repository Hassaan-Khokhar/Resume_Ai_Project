import { useState, useEffect } from 'react';
import { jobsAPI } from '../api';
import { Briefcase, Users, Eye, Download, Clock, CheckCircle, XCircle, AlertTriangle, X, Loader2, FileText, ChevronLeft, BarChart3, TrendingUp, Calendar, Edit2, Trash2 } from 'lucide-react';

const STATUS_COLORS = { pending: 'var(--warning)', reviewed: 'var(--accent)', shortlisted: 'var(--success)', rejected: 'var(--danger)' };
const STATUS_ICONS = { pending: Clock, reviewed: Eye, shortlisted: CheckCircle, rejected: XCircle };

export default function RecruiterDashboard({ addToast, onEditJob }) {
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [viewApp, setViewApp] = useState(null);

  useEffect(() => { loadMyJobs(); }, []);
  const loadMyJobs = async () => {
    try { const r = await jobsAPI.myJobs(); setMyJobs(r.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadApps = async (job) => {
    setSelectedJob(job); setAppsLoading(true);
    try { const r = await jobsAPI.getApplications(job._id); setApps(r.data || []); } catch (e) { addToast(e.message, 'error'); }
    finally { setAppsLoading(false); }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting? This will also delete all associated applications and cannot be undone.')) return;
    try {
      const r = await jobsAPI.delete(jobId);
      if (r.success) {
        addToast('Job deleted successfully');
        setMyJobs(myJobs.filter(j => j._id !== jobId));
      } else throw new Error(r.detail || 'Failed to delete');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleStatus = async (appId, status) => {
    try {
      await jobsAPI.updateStatus(selectedJob._id, appId, status);
      addToast(`Status updated to ${status}`);
      setApps(apps.map(a => a._id === appId ? { ...a, status } : a));
      if (viewApp && viewApp._id === appId) setViewApp({ ...viewApp, status });
    } catch (e) { addToast(e.message, 'error'); }
  };

  const downloadResume = async (app) => {
    try {
      const r = await jobsAPI.getResume(selectedJob._id, app._id);
      if (!r.success) throw new Error('Failed');
      const bin = atob(r.data.resume_data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = r.data.filename || 'resume.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { addToast('Failed to download resume', 'error'); }
  };

  // Compute stats
  const totalJobs = myJobs.length;
  const totalApplicants = myJobs.reduce((acc, j) => acc + (j.applicant_count || 0), 0);
  const activeJobs = myJobs.filter(j => j.applicant_count > 0).length;

  // Job list view
  if (!selectedJob) return (
    <div className="fade-in">
      {/* Dashboard Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: 'rgba(108,92,231,0.1)', borderRadius: 12 }}><Briefcase size={24} color="var(--accent)" /></div>
          <div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalJobs}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Job Postings</div></div>
        </div>
        <div className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: 'rgba(32,201,151,0.1)', borderRadius: 12 }}><Users size={24} color="var(--success)" /></div>
          <div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalApplicants}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Applicants</div></div>
        </div>
        <div className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: 'rgba(253,126,20,0.1)', borderRadius: 12 }}><TrendingUp size={24} color="var(--warning)" /></div>
          <div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{activeJobs}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Jobs with Applicants</div></div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={18} /> Manage Postings
        </h3>
        
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
          : myJobs.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No jobs posted yet</div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 8px', fontWeight: 600 }}>Job Title</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600 }}>Type & Location</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600 }}>Posted On</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'center' }}>Applicants</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myJobs.map(j => (
                    <tr key={j._id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px 8px', fontWeight: 600 }}>{j.title}</td>
                      <td style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{j.job_type} · {j.location || 'N/A'}</td>
                      <td style={{ padding: '16px 8px', color: 'var(--text-muted)' }}>{new Date(j.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <span className="chip chip-purple"><Users size={12} /> {j.applicant_count || 0}</span>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button className="btn-secondary" onClick={() => loadApps(j)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}><Eye size={14} style={{ marginRight: 4 }} /> View</button>
                          <button className="btn-ghost" onClick={() => onEditJob(j)} title="Edit Job" style={{ padding: 6, color: 'var(--text-secondary)' }}><Edit2 size={16} /></button>
                          <button className="btn-ghost" onClick={() => handleDeleteJob(j._id)} title="Delete Job" style={{ padding: 6, color: 'var(--danger)' }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );

  // Applicants view for selected job
  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={() => { setSelectedJob(null); setApps([]); setViewApp(null); }} style={{ marginBottom: 16, fontSize: '0.85rem' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Sidebar: Job Summary & Filters */}
        <div className="glass-card" style={{ padding: 20, position: 'sticky', top: 80 }}>
          <h3 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.2rem', lineHeight: 1.3 }}>{selectedJob.title}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            {selectedJob.location} · {selectedJob.job_type}
          </p>

          <div style={{ padding: 16, background: 'rgba(108,92,231,0.05)', borderRadius: 12, border: '1px solid rgba(108,92,231,0.1)', marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Total Pipeline</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{apps.length}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Status Breakdown</div>
            {['pending', 'reviewed', 'shortlisted', 'rejected'].map(s => {
              const count = apps.filter(a => a.status === s).length;
              return (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: STATUS_COLORS[s], textTransform: 'capitalize' }}>{s}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Applicants List / Detail View */}
        <div>
          {viewApp ? (
            <div className="glass-card fade-in" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="avatar" style={{ width: 64, height: 64, fontSize: '1.5rem', overflow: 'hidden' }}>
                    {viewApp.applicant_avatar ? <img src={viewApp.applicant_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (viewApp.applicant_name || 'U')[0]}
                  </div>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: 4 }}>{viewApp.applicant_name}</h2>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{viewApp.applicant_email}</div>
                    {viewApp.applicant_headline && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{viewApp.applicant_headline}</div>}
                  </div>
                </div>
                <button className="btn-ghost" onClick={() => setViewApp(null)}><X size={20} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                <div>
                  {viewApp.method === 'form' && viewApp.answers && Object.keys(viewApp.answers).length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} /> Application Form Responses</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {Object.entries(viewApp.answers).map(([key, val]) => {
                          const field = selectedJob.application_form?.find(f => f.id === key);
                          const questionLabel = field ? field.label : key;
                          const displayVal = Array.isArray(val) ? val.join(', ') : val;
                          return (
                            <div key={key} style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{questionLabel}</div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{displayVal || '—'}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} /> Attached Resume</h4>
                    {viewApp.has_resume ? (
                      <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <FileText size={24} color="var(--success)" />
                          <div>
                            <div style={{ fontWeight: 600 }}>{viewApp.resume_filename}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF Document</div>
                          </div>
                        </div>
                        <button className="btn-primary" onClick={() => downloadResume(viewApp)}><Download size={14} /> Download</button>
                      </div>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>No resume attached</div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Update Status</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {['pending', 'reviewed', 'shortlisted', 'rejected'].map(s => {
                        const active = viewApp.status === s;
                        const SIcon = STATUS_ICONS[s];
                        return (
                          <button key={s} className={active ? 'btn-primary' : 'btn-secondary'}
                            onClick={() => handleStatus(viewApp._id, s)}
                            style={{ justifyContent: 'flex-start', padding: '10px 16px', textTransform: 'capitalize', border: active ? 'none' : `1px solid ${STATUS_COLORS[s]}44` }}>
                            <SIcon size={16} style={{ color: active ? '#fff' : STATUS_COLORS[s], marginRight: 8 }} /> {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ fontWeight: 600 }}>Applicant Pipeline</h4>
              </div>
              
              {appsLoading ? <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
                : apps.length === 0 ? <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>No applications received yet.</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {apps.map((a, idx) => {
                      const SIcon = STATUS_ICONS[a.status] || Clock;
                      return (
                        <div key={a._id} style={{ padding: '16px 24px', borderBottom: idx < apps.length - 1 ? '1px solid var(--glass-border)' : 'none', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onClick={() => setViewApp(a)} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div className="avatar" style={{ width: 44, height: 44, fontSize: '1rem', overflow: 'hidden' }}>
                              {a.applicant_avatar ? <img src={a.applicant_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.applicant_name || 'U')[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 2 }}>{a.applicant_name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {new Date(a.created_at).toLocaleDateString()}</span>
                                <span>{a.method === 'form' ? 'Form + Resume' : 'Resume'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            {a.has_resume && <FileText size={16} color="var(--text-muted)" title="Has resume" />}
                            <span className="chip" style={{ background: `${STATUS_COLORS[a.status]}15`, color: STATUS_COLORS[a.status], border: `1px solid ${STATUS_COLORS[a.status]}44`, fontSize: '0.75rem', fontWeight: 600, width: 100, justifyContent: 'center' }}>
                              <SIcon size={12} /> {a.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
