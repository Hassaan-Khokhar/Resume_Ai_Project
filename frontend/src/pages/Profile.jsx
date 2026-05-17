import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, postsAPI } from '../api';
import { Edit3, MapPin, UserPlus, UserCheck, GraduationCap, Briefcase, Plus, Trash2, Save, X, Heart, MessageCircle, Calendar, Building, Camera, Image as ImageIcon, Layout, User, History, Loader2, ChevronLeft, ChevronRight, Globe, MoreHorizontal, Send } from 'lucide-react';

// ─── Unified Edit Profile Center ────────────────
function EditProfileCenter({ profile, onClose, onSaved, addToast }) {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: profile.name || '', headline: profile.headline || '',
    location: profile.location || '', about: profile.about || '',
    avatar: profile.avatar || '', cover_photo: profile.cover_photo || '',
  });

  const pfpInput = useRef(null);
  const coverInput = useRef(null);

  const u = (k, v) => setForm({ ...form, [k]: v });

  const handleImage = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return addToast('File too large (max 2MB)', 'error');
    
    const reader = new FileReader();
    reader.onloadend = () => u(type, reader.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.updateProfile(form);
      addToast('Profile updated successfully!');
      onSaved(res.data);
      onClose();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-card" style={{ maxWidth: 650, height: '80vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Edit Profile Center</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manage your professional identity</p>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-tabs">
          <div className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}><User size={14} /> Details</div>
          <div className={`modal-tab ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}><ImageIcon size={14} /> Images</div>
          <div className={`modal-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><History size={14} /> Experience & Education</div>
        </div>

        <div className="modal-body">
          {activeTab === 'details' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="form-label">Full Name</label><input className="input-field" value={form.name} onChange={e => u('name', e.target.value)} /></div>
              <div><label className="form-label">Headline</label><input className="input-field" placeholder="Full Stack Developer | AI Enthusiast" value={form.headline} onChange={e => u('headline', e.target.value)} /></div>
              <div><label className="form-label">Location</label><input className="input-field" placeholder="Sargodha, Punjab" value={form.location} onChange={e => u('location', e.target.value)} /></div>
              <div><label className="form-label">About</label><textarea className="textarea-field" style={{ minHeight: 120 }} placeholder="Tell us about your professional journey..." value={form.about} onChange={e => u('about', e.target.value)} /></div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="form-label">Cover Banner</label>
                <div className="img-upload-preview" style={{ height: 140 }}>
                  {form.cover_photo ? <img src={form.cover_photo} alt="" /> : <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No banner uploaded</div>}
                  <button className="btn-primary img-upload-btn" onClick={() => coverInput.current.click()}><Camera size={14} /> Change Banner</button>
                  <input ref={coverInput} type="file" accept="image/*" hidden onChange={e => handleImage(e, 'cover_photo')} />
                </div>
              </div>
              <div>
                <label className="form-label">Profile Photo</label>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div className="profile-avatar" style={{ width: 100, height: 100, fontSize: '2rem', flexShrink: 0 }}>
                    {form.avatar ? <img src={form.avatar} alt="" /> : profile.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Recommended: Square image, max 2MB.</p>
                    <button className="btn-secondary" onClick={() => pfpInput.current.click()}><Camera size={14} /> Upload New Photo</button>
                    <input ref={pfpInput} type="file" accept="image/*" hidden onChange={e => handleImage(e, 'avatar')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: '0.9rem' }}>Work Experience</h4>
                  <button className="btn-ghost" style={{ color: 'var(--accent)' }} onClick={() => addToast('Use the "Add" button on the profile page for now, or I can add a direct link here.')}><Plus size={14} /> Add</button>
                </div>
                {profile.experience?.map(exp => (
                  <div key={exp.id} className="glass-card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem' }}><strong>{exp.title}</strong> at {exp.company}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost" style={{ color: 'var(--danger)' }} onClick={async () => { await usersAPI.deleteExperience(exp.id); onSaved(); }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: '0.9rem' }}>Education</h4>
                  <button className="btn-ghost" style={{ color: 'var(--accent)' }}><Plus size={14} /> Add</button>
                </div>
                {profile.education?.map(edu => (
                  <div key={edu.id} className="glass-card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem' }}><strong>{edu.degree}</strong> at {edu.school}</div>
                    <button className="btn-ghost" style={{ color: 'var(--danger)' }} onClick={async () => { await usersAPI.deleteEducation(edu.id); onSaved(); }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={loading}><Save size={16} /> Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── Education & Experience Modals (Keep these for granular editing) ────────
function EduModal({ initial, onClose, onSaved, addToast }) {
  const [form, setForm] = useState(initial || { school: '', degree: '', field_of_study: '', start_year: '', end_year: '', description: '' });
  const [loading, setLoading] = useState(false);
  const u = (k, v) => setForm({ ...form, [k]: v });
  const isEdit = !!initial?.id;

  const save = async () => {
    if (!form.school) return addToast('School name is required', 'error');
    setLoading(true);
    try {
      if (isEdit) await usersAPI.updateEducation(initial.id, form);
      else await usersAPI.addEducation(form);
      addToast(isEdit ? 'Education updated!' : 'Education added!');
      onSaved(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{isEdit ? 'Edit' : 'Add'} Education</h3><button className="btn-ghost" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div><label className="form-label">School / University</label><input className="input-field" placeholder="COMSATS University" value={form.school} onChange={e => u('school', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Degree</label><input className="input-field" placeholder="BS Computer Science" value={form.degree} onChange={e => u('degree', e.target.value)} /></div>
            <div><label className="form-label">Field of Study</label><input className="input-field" placeholder="Computer Science" value={form.field_of_study} onChange={e => u('field_of_study', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Start Year</label><input className="input-field" placeholder="2021" value={form.start_year} onChange={e => u('start_year', e.target.value)} /></div>
            <div><label className="form-label">End Year</label><input className="input-field" placeholder="2025" value={form.end_year} onChange={e => u('end_year', e.target.value)} /></div>
          </div>
          <div><label className="form-label">Description</label><textarea className="textarea-field" placeholder="Activities, achievements..." value={form.description} onChange={e => u('description', e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={loading}><Save size={16} /> {isEdit ? 'Update' : 'Add'}</button>
        </div>
      </div>
    </div>
  );
}

function ExpModal({ initial, onClose, onSaved, addToast }) {
  const [form, setForm] = useState(initial || { title: '', company: '', location: '', start_date: '', end_date: '', current: false, description: '' });
  const [loading, setLoading] = useState(false);
  const u = (k, v) => setForm({ ...form, [k]: v });
  const isEdit = !!initial?.id;

  const save = async () => {
    if (!form.title || !form.company) return addToast('Title and company are required', 'error');
    setLoading(true);
    try {
      if (isEdit) await usersAPI.updateExperience(initial.id, form);
      else await usersAPI.addExperience(form);
      addToast(isEdit ? 'Experience updated!' : 'Experience added!');
      onSaved(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{isEdit ? 'Edit' : 'Add'} Experience</h3><button className="btn-ghost" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div><label className="form-label">Title</label><input className="input-field" placeholder="Software Engineer" value={form.title} onChange={e => u('title', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Company</label><input className="input-field" placeholder="Google" value={form.company} onChange={e => u('company', e.target.value)} /></div>
            <div><label className="form-label">Location</label><input className="input-field" placeholder="Remote" value={form.location} onChange={e => u('location', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Start Date</label><input className="input-field" placeholder="Jan 2023" value={form.start_date} onChange={e => u('start_date', e.target.value)} /></div>
            <div><label className="form-label">End Date</label><input className="input-field" placeholder="Present" value={form.end_date} onChange={e => u('end_date', e.target.value)} disabled={form.current} /></div>
          </div>
          <label className="radio-label" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={form.current} onChange={e => u('current', e.target.checked)} /> I currently work here
          </label>
          <div><label className="form-label">Description</label><textarea className="textarea-field" placeholder="Responsibilities, achievements..." value={form.description} onChange={e => u('description', e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={loading}><Save size={16} /> {isEdit ? 'Update' : 'Add'}</button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, allComments, onReply, onLike, onDelete, currentUser, postAuthorId }) {
  const isLiked = comment.likes?.includes(currentUser?.id);
  const replies = allComments.filter(c => c.parent_id === comment._id);
  const canDelete = currentUser?.id === comment.user_id || currentUser?.id === postAuthorId;
  
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <div className="avatar" style={{ width: 32, height: 32, overflow: 'hidden', flexShrink: 0 }}>
        {comment.author?.avatar ? <img src={comment.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (comment.author?.name || 'U')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '0 16px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{comment.author?.name || ''}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>{comment.author?.headline || ''}</div>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{comment.text}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button onClick={() => onLike(comment._id)} style={{ background: 'none', border: 'none', color: isLiked ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
               <Heart size={14} fill={isLiked ? 'var(--accent)' : 'none'} />
               {comment.like_count > 0 && <span style={{ fontSize: '0.65rem' }}>{comment.like_count}</span>}
            </button>
            {canDelete && (
              <button onClick={() => onDelete(comment._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4, opacity: 0.7 }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.7}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, paddingLeft: 4, display: 'flex', gap: 14, alignItems: 'center' }}>
          <span>{comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}</span>
          <span style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => onReply(comment)}>Reply</span>
        </div>
        
        {/* Render Replies */}
        {replies?.length > 0 && (
           <div style={{ marginTop: 12 }}>
             {replies.map(reply => (
               <CommentItem key={reply._id} comment={reply} allComments={allComments} onReply={onReply} onLike={onLike} onDelete={onDelete} currentUser={currentUser} postAuthorId={postAuthorId} />
             ))}
           </div>
        )}
      </div>
    </div>
  )
}

// ─── Post Card ──────────────────────────────
function PostCard({ post, author, addToast, onDeleted }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [currentImg, setCurrentImg] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content || '');
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const media = post.media || (post.media_url ? [post.media_url] : []);

  const isOwn = currentUser?.id === post.author_id;
  const timeAgo = post.created_at ? new Date(post.created_at).toLocaleDateString() : '';
  const content = editing ? '' : (post.content || '');
  const shouldTruncate = content.length > 200;
  const displayContent = (shouldTruncate && !expanded) ? content.slice(0, 200) + '...' : content;

  const handleLike = async () => {
    try { const res = await postsAPI.like(post._id); setLiked(res.liked); setLikeCount(prev => res.liked ? prev + 1 : prev - 1); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const nextImg = (e) => { e.stopPropagation(); setCurrentImg(prev => (prev + 1) % media.length); };
  const prevImg = (e) => { e.stopPropagation(); setCurrentImg(prev => (prev - 1 + media.length) % media.length); };
  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try { await postsAPI.delete(post._id); addToast('Post deleted'); onDeleted?.(); }
    catch (e) { addToast(e.message, 'error'); }
    setShowMenu(false);
  };
  const handleEdit = async () => {
    try { await postsAPI.update(post._id, { content: editText }); post.content = editText; setEditing(false); addToast('Post updated'); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const loadComments = async (page = 0) => {
    if (page === 0) setShowComments(!showComments);
    if (page > 0 || !showComments) { 
      try { 
        const res = await postsAPI.getComments(post._id, page * 10, 10); 
        if (res.data.length < 10) setHasMoreComments(false);
        else setHasMoreComments(true);
        if (page === 0) setComments(res.data);
        else setComments(prev => [...prev, ...res.data]);
        setCommentPage(page);
      } catch (e) { console.error(e); } 
    }
  };
  const submitComment = async () => {
    if (!commentText.trim()) return;
    try { 
      await postsAPI.addComment(post._id, commentText, replyingTo?._id); 
      setCommentText(''); 
      setReplyingTo(null);
      setCommentCount(prev => prev + 1);
      await loadComments(0);
    }
    catch (e) { addToast(e.message, 'error'); }
  };
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await postsAPI.deleteComment(post._id, commentId);
      setComments(prev => {
        const toDelete = prev.filter(c => c._id === commentId || c.parent_id === commentId);
        setCommentCount(count => Math.max(0, count - toDelete.length));
        return prev.filter(c => c._id !== commentId && c.parent_id !== commentId);
      });
      addToast('Comment deleted');
    } catch (e) { addToast(e.message, 'error'); }
  };
  const handleLikeComment = async (commentId) => {
    try {
      const res = await postsAPI.likeComment(post._id, commentId);
      setComments(prev => prev.map(c => {
        if (c._id === commentId) {
          const newLikes = res.liked ? [...(c.likes || []), currentUser.id] : (c.likes || []).filter(uid => uid !== currentUser.id);
          return { ...c, likes: newLikes, like_count: c.like_count + (res.liked ? 1 : -1) };
        }
        return c;
      }));
    } catch (e) { console.error(e); }
  };

  const topLevelComments = comments.filter(c => !c.parent_id);

  return (
    <div className="glass-card post-card fade-in" style={{ padding: '16px 0 0', marginBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '0 20px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="avatar" style={{ width: 44, height: 44, overflow: 'hidden' }}>
            {author?.avatar ? <img src={author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (author?.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{author?.name || ''}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{author?.headline || ''}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>{timeAgo} · <Globe size={10} /></div>
          </div>
        </div>
        {isOwn && (
          <div className="post-menu-wrap">
            <button className="post-menu-btn" onClick={() => setShowMenu(!showMenu)}><MoreHorizontal size={20} /></button>
            {showMenu && (
              <div className="post-menu-dropdown">
                <button className="post-menu-item" onClick={() => { setEditing(true); setShowMenu(false); }}><Edit3 size={14} /> Edit caption</button>
                <button className="post-menu-item danger" onClick={handleDelete}><Trash2 size={14} /> Delete post</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caption or Edit Mode */}
      {editing ? (
        <div style={{ padding: '0 20px', marginBottom: 12 }}>
          <textarea className="textarea-field" value={editText} onChange={e => setEditText(e.target.value)} style={{ minHeight: 60, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleEdit} style={{ padding: '6px 16px' }}>Save</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 20px', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 12 }}>
          {displayContent}
          {shouldTruncate && !expanded && <span className="see-more-btn" onClick={() => setExpanded(true)}>...see more</span>}
        </div>
      )}

      {/* Media */}
      {media.length > 0 && (
        <div style={{ position: 'relative', width: '100%', height: 500, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${media[currentImg]})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(30px) brightness(0.2)', opacity: 0.6 }} />
          <img src={media[currentImg]} alt="" style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', zIndex: 2 }} />
          {media.length > 1 && (<>
            <button className="carousel-btn left" onClick={prevImg}><ChevronLeft size={24} /></button>
            <button className="carousel-btn right" onClick={nextImg}><ChevronRight size={24} /></button>
            <div className="carousel-dots">{media.map((_, i) => (<div key={i} className={`carousel-dot ${i === currentImg ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setCurrentImg(i); }} />))}</div>
          </>)}
        </div>
      )}

      {/* Stats */}
      <div className="post-stats-row" style={{ borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Heart size={12} fill="var(--accent)" color="var(--accent)" /> <span>{likeCount}</span></div>
        <div style={{ cursor: 'pointer' }} onClick={() => loadComments(0)}>{commentCount} comments</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', padding: '4px 12px', borderTop: '1px solid var(--glass-border)' }}>
        <button className="social-action-btn" onClick={handleLike} style={liked ? { color: 'var(--accent)' } : {}}>
          <Heart size={18} fill={liked ? 'var(--accent)' : 'none'} /> <span>Like</span>
        </button>
        <button className="social-action-btn" onClick={() => loadComments(0)}>
          <MessageCircle size={18} /> <span>Comment</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ padding: 16, borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
            <div className="avatar" style={{ width: 32, height: 32, overflow: 'hidden', flexShrink: 0 }}>
              {currentUser?.avatar ? <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (currentUser?.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {replyingTo && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Replying to <strong>{replyingTo.author?.name}</strong></span>
                  <span style={{ cursor: 'pointer' }} onClick={() => setReplyingTo(null)}>Cancel</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder={replyingTo ? "Write a reply..." : "Add a comment..."} className="input-field" value={commentText}
                  onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()}
                  style={{ borderRadius: 20, padding: '8px 16px', fontSize: '0.85rem' }} />
                <button className="btn-primary" onClick={submitComment} style={{ padding: '0 16px', borderRadius: 20, fontSize: '0.8rem' }}>Post</button>
              </div>
            </div>
          </div>
          {topLevelComments.map(c => (
            <CommentItem key={c._id} comment={c} allComments={comments} onReply={setReplyingTo} onLike={handleLikeComment} onDelete={handleDeleteComment} currentUser={currentUser} postAuthorId={post.author_id} />
          ))}
          {hasMoreComments && comments.length > 0 && (
            <button onClick={() => loadComments(commentPage + 1)} style={{ width: '100%', padding: '8px 0', background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginTop: 8 }}>Load more comments</button>
          )}
        </div>
      )}
    </div>
  );
}

function UserListSkeleton() {
  return [1,2,3].map(i => (
    <div key={i} className="search-item" style={{ marginBottom: 12, padding: 8 }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '40%', height: 10 }} />
      </div>
    </div>
  ));
}

// ─── User List Modal (Followers/Following) ───
function UserListModal({ title, userId, type, onClose, addToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = type === 'followers' ? await usersAPI.followers(userId) : await usersAPI.following(userId);
        setUsers(res.data || []);
      } catch (e) { addToast('Failed to load list', 'error'); }
      finally { setLoading(false); }
    };
    load();
  }, [userId, type]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-card" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{title}</h3><button className="btn-ghost" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? <UserListSkeleton /> :
           users.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No one yet</div> :
           users.map(u => (
             <div key={u._id} className="search-item" style={{ marginBottom: 12, padding: 8 }} onClick={() => { navigate(`/profile/${u._id}`); onClose(); }}>
                <div className="avatar" style={{ width: 40, height: 40, overflow: 'hidden' }}>
                  {u.avatar ? <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.headline}</div>
                </div>
             </div>
           ))
          }
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="glass-card" style={{ height: 260, borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
        <div className="skeleton" style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="glass-card" style={{ padding: '85px 40px 32px', marginTop: -20, borderRadius: '0 0 20px 20px' }}>
        <div className="skeleton" style={{ width: 160, height: 160, borderRadius: '50%', position: 'absolute', top: 180, left: 40, border: '4px solid var(--bg-primary)' }} />
        <div className="skeleton" style={{ width: '40%', height: 32, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="skeleton" style={{ width: 80, height: 16 }} />
          <div className="skeleton" style={{ width: 80, height: 16 }} />
        </div>
      </div>
      <div className="glass-card" style={{ padding: 24, marginTop: 20 }}>
        <div className="skeleton" style={{ width: '30%', height: 20, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 60 }} />
      </div>
    </div>
  );
}

// ─── Main Profile Page ──────────────────────
export default function Profile({ addToast }) {
  const { userId } = useParams();
  const { user: currentUser, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditCenter, setShowEditCenter] = useState(false);
  const [showEduModal, setShowEduModal] = useState(null);
  const [showExpModal, setShowExpModal] = useState(null);
  const [showListModal, setShowListModal] = useState(null); // { title, type }

  const isOwn = currentUser?.id === userId;

  const loadProfile = async () => {
    try {
      const res = await usersAPI.profile(userId);
      setProfile(res.data);
      setIsFollowing(res.data.is_following);
    } catch (e) { addToast('Could not load profile', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); loadProfile(); }, [userId]);

  const handleFollow = async () => {
    try {
      const res = await usersAPI.follow(userId);
      setIsFollowing(res.following);
      addToast(res.following ? 'Following!' : 'Unfollowed');
      loadProfile();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const onProfileSaved = (updatedData) => {
    if (!updatedData) {
      loadProfile(); // Reload if no data provided (e.g. from deletion)
      return;
    }
    setProfile(prev => ({ ...prev, ...updatedData }));
    if (isOwn) {
      const updatedUser = { 
        ...currentUser, 
        name: updatedData.name, 
        headline: updatedData.headline, 
        avatar: updatedData.avatar,
        cover_photo: updatedData.cover_photo 
      };
      login(localStorage.getItem('token'), updatedUser);
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <div className="page-container" style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 80 }}>Profile not found</div>;

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ─── Cover & Avatar Section ─── */}
      <div className="profile-cover glass-card">
        <div className="cover-image" style={{ 
          background: profile.cover_photo ? `url(${profile.cover_photo})` : 'linear-gradient(135deg, rgba(108,92,231,0.3), rgba(168,85,247,0.2))' 
        }} />
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : profile.name?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ─── Info Section ─── */}
      <div className="glass-card profile-info fade-in">
        <div className="profile-info-main">
          <div style={{ flex: 1 }}>
            <h1 className="profile-name">{profile.name}</h1>
            {profile.headline && <p className="profile-headline">{profile.headline}</p>}
            {profile.location && <p className="profile-location"><MapPin size={14} /> {profile.location}</p>}
            <div className="profile-stats-row">
              <span style={{ cursor: 'pointer' }} onClick={() => setShowListModal({ title: 'Followers', type: 'followers' })}>
                <strong>{profile.followers?.length || 0}</strong> followers
              </span>
              <span style={{ cursor: 'pointer' }} onClick={() => setShowListModal({ title: 'Following', type: 'following' })}>
                <strong>{profile.following?.length || 0}</strong> following
              </span>
              {profile.avg_match_score && <span className="chip chip-purple">Avg Match: {profile.avg_match_score}%</span>}
              
              {/* Relocated Edit Button */}
              {isOwn && (
                <button className="btn-secondary" style={{ marginLeft: 8, padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowEditCenter(true)}>
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
            </div>
          </div>
          <div className="profile-actions">
            {!isOwn && (
              <button className={isFollowing ? 'btn-secondary' : 'btn-primary'} onClick={handleFollow}>
                {isFollowing ? <><UserCheck size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
              </button>
            )}
          </div>
        </div>
        {profile.about && (
          <div className="profile-about">
            <h3 className="section-title">About</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{profile.about}</p>
          </div>
        )}
      </div>

      {/* ─── Experience Section ─── */}
      <div className="glass-card profile-section fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title"><Briefcase size={18} className="icon" /> Experience</h3>
          {isOwn && <button className="btn-ghost" onClick={() => setShowExpModal({})}><Plus size={16} /> Add</button>}
        </div>
        {(!profile.experience || profile.experience.length === 0) ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>No experience added yet</p>
        ) : profile.experience.map((exp, i) => (
          <div key={exp.id || i} className="timeline-item">
            <div className="timeline-icon"><Briefcase size={16} /></div>
            <div className="timeline-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 className="timeline-title">{exp.title}</h4>
                  <p className="timeline-subtitle"><Building size={13} /> {exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                  <p className="timeline-date"><Calendar size={12} /> {exp.start_date}{exp.end_date ? ` – ${exp.current ? 'Present' : exp.end_date}` : ''}</p>
                </div>
                {isOwn && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" onClick={() => setShowExpModal(exp)}><Edit3 size={14} /></button>
                  </div>
                )}
              </div>
              {exp.description && <p className="timeline-desc">{exp.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Education Section ─── */}
      <div className="glass-card profile-section fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title"><GraduationCap size={18} className="icon" /> Education</h3>
          {isOwn && <button className="btn-ghost" onClick={() => setShowEduModal({})}><Plus size={16} /> Add</button>}
        </div>
        {(!profile.education || profile.education.length === 0) ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>No education added yet</p>
        ) : [...profile.education].reverse().map((edu, i) => (
          <div key={edu.id || i} className="timeline-item">
            <div className="timeline-icon"><GraduationCap size={16} /></div>
            <div className="timeline-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 className="timeline-title">{edu.degree}</h4>
                  <p className="timeline-subtitle" style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>{edu.school}</p>
                  {edu.field_of_study && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Field of Study: {edu.field_of_study}
                    </p>
                  )}
                  <p className="timeline-date"><Calendar size={12} /> {edu.start_year}{edu.end_year ? ` – ${edu.end_year}` : ''}</p>
                </div>
                {isOwn && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" onClick={() => setShowEduModal(edu)}><Edit3 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── User's Posts ─── */}
      <div className="profile-section fade-in">
        <h3 className="section-title" style={{ marginBottom: 16 }}>Posts</h3>
        {(!profile.posts || profile.posts.length === 0) ? (
          <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No posts yet</div>
        ) : profile.posts.map(p => <PostCard key={p._id} post={p} author={profile} addToast={addToast} onDeleted={loadProfile} />)}
      </div>

      {/* ─── Modals ─── */}
      {showEditCenter && <EditProfileCenter profile={profile} onClose={() => setShowEditCenter(false)} onSaved={onProfileSaved} addToast={addToast} />}
      {showEduModal !== null && <EduModal initial={showEduModal?.id ? showEduModal : null} onClose={() => setShowEduModal(null)} onSaved={loadProfile} addToast={addToast} />}
      {showExpModal !== null && <ExpModal initial={showExpModal?.id ? showExpModal : null} onClose={() => setShowExpModal(null)} onSaved={loadProfile} addToast={addToast} />}
      {showListModal !== null && <UserListModal title={showListModal.title} userId={userId} type={showListModal.type} onClose={() => setShowListModal(null)} addToast={addToast} />}
    </div>
  );
}
