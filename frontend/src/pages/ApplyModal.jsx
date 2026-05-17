import { useState, useRef } from 'react';
import { jobsAPI } from '../api';
import { Upload, FileText, Loader2, X, Send, CheckCircle } from 'lucide-react';

export default function ApplyModal({ job, onClose, addToast }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState({});
  const inputRef = useRef(null);
  const hasForm = job.application_form && job.application_form.length > 0;

  const handleApply = async () => {
    if (!file) return addToast('Upload your resume first', 'error');
    if (hasForm) {
      for (const f of job.application_form) {
        if (f.required && !answers[f.id]?.trim?.()) return addToast(`"${f.label}" is required`, 'error');
      }
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      let res;
      if (hasForm) {
        fd.append('answers_json', JSON.stringify(answers));
        res = await jobsAPI.applyForm(job._id, fd);
      } else {
        res = await jobsAPI.apply(job._id, fd);
      }
      if (res.success) { setDone(true); addToast('Application submitted!'); }
      else throw new Error(res.detail || 'Failed');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center', padding: 40 }}>
        <CheckCircle size={48} color="var(--success)" style={{ marginBottom: 16 }} />
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Application Submitted!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>Your application for <strong>{job.title}</strong> has been sent to the recruiter.</p>
        <button className="btn-primary" onClick={onClose} style={{ padding: '10px 32px' }}>Done</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, maxHeight: '85vh', overflow: 'auto' }}>
        <div className="modal-header">
          <div><h3><Send size={18} color="var(--accent)" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Apply to Job</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{job.title}</p></div>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Resume Upload (always mandatory) */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Resume / CV (PDF or Word) *</label>
            <div className={`upload-zone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} style={{ padding: '20px 16px' }}>
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
              {file ? (<><FileText size={28} color="var(--success)" /><p style={{ fontWeight: 600, color: 'var(--success)', marginTop: 4, fontSize: '0.85rem' }}>{file.name}</p></>)
                : (<><Upload size={28} color="var(--text-muted)" /><p style={{ fontWeight: 600, marginTop: 4 }}>Upload Resume</p><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF or Word file</p></>)}
            </div>
          </div>

          {/* Custom Form Fields */}
          {hasForm && job.application_form.map(f => (
            <div key={f.id} style={{ marginBottom: 14 }}>
              <label className="form-label">{f.label} {f.required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
              {f.type === 'text' && <input className="input-field" value={answers[f.id] || ''} onChange={e => setAnswers({ ...answers, [f.id]: e.target.value })} />}
              {f.type === 'textarea' && <textarea className="textarea-field" style={{ minHeight: 60 }} value={answers[f.id] || ''} onChange={e => setAnswers({ ...answers, [f.id]: e.target.value })} />}
              {f.type === 'select' && (
                <select className="input-field" style={{ padding: '10px 14px', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }} value={answers[f.id] || ''} onChange={e => setAnswers({ ...answers, [f.id]: e.target.value })}>
                  <option value="" style={{ color: 'var(--text-muted)' }}>Select...</option>
                  {f.options?.map((o, i) => <option key={i} value={o.value || o.label} style={{ color: 'var(--text-primary)' }}>{o.label}</option>)}
                </select>
              )}
              {f.type === 'radio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {f.options?.map((o, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="radio" name={f.id} value={o.value || o.label} checked={answers[f.id] === (o.value || o.label)} onChange={e => setAnswers({ ...answers, [f.id]: e.target.value })} style={{ accentColor: 'var(--accent)' }} /> {o.label}
                    </label>
                  ))}
                </div>
              )}
              {f.type === 'checkbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {f.options?.map((o, i) => {
                    const checkedArray = Array.isArray(answers[f.id]) ? answers[f.id] : [];
                    const isChecked = checkedArray.includes(o.value || o.label);
                    return (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="checkbox" name={f.id} value={o.value || o.label} checked={isChecked} onChange={e => {
                          const val = o.value || o.label;
                          if (e.target.checked) setAnswers({ ...answers, [f.id]: [...checkedArray, val] });
                          else setAnswers({ ...answers, [f.id]: checkedArray.filter(v => v !== val) });
                        }} style={{ accentColor: 'var(--accent)' }} /> {o.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <button className="btn-primary" onClick={handleApply} disabled={loading || !file} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Send size={16} /> Submit Application</>}
          </button>
        </div>
      </div>
    </div>
  );
}
