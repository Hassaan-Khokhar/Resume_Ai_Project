import { CheckCircle, XCircle } from 'lucide-react';
export default function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? <CheckCircle size={16} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} /> : <XCircle size={16} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
