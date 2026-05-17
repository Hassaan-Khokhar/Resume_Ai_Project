import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, usersAPI } from '../api';
import { Image, Send, Heart, MessageCircle, TrendingUp, Users, Briefcase, Loader2, MapPin, DollarSign, Clock, Zap, ChevronLeft, ChevronRight, X, Plus, Globe, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';

function CreatePost({ onCreated, addToast, userName, userAvatar }) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]); // List of Base64 strings
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        addToast(`File ${file.name} is too large (max 2MB)`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedia(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) return;
    setLoading(true);
    try {
      await postsAPI.create({ content, media });
      setContent('');
      setMedia([]);
      onCreated();
      addToast('Post shared!');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card create-post fade-in" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="avatar" style={{ width: 48, height: 48, overflow: 'hidden' }}>
          {userAvatar ? <img src={userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userName?.[0]?.toUpperCase()}
        </div>
        <textarea className="textarea-field" style={{ minHeight: 60 }} placeholder="Share an update, project, or achievement..."
          value={content} onChange={e => setContent(e.target.value)} />
      </div>

      {media.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 15, flexWrap: 'wrap' }}>
          {media.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removeMedia(idx)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: 2, color: 'white', cursor: 'pointer' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={() => fileInputRef.current.click()}>
            <Image size={18} /> <span>Photo</span>
          </button>
          <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={handleFileChange} />
        </div>
        <button className="btn-primary" onClick={handleSubmit} disabled={loading || (!content.trim() && media.length === 0)} style={{ padding: '8px 20px' }}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={16} /> Post</>}
        </button>
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

function PostCard({ post, addToast, onDeleted }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [currentImg, setCurrentImg] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content || '');
  const media = post.media || (post.media_url ? [post.media_url] : []);

  const author = post.author || {};
  const isOwn = currentUser?.id === post.author_id;
  const timeAgo = post.created_at ? new Date(post.created_at).toLocaleDateString() : '';
  const content = editing ? '' : (post.content || '');
  const shouldTruncate = content.length > 200;
  const displayContent = (shouldTruncate && !expanded) ? content.slice(0, 200) + '...' : content;

  const handleLike = async () => {
    try { const res = await postsAPI.like(post._id); setLiked(res.liked); setLikeCount(prev => res.liked ? prev + 1 : prev - 1); }
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
      // Reload from top to see new comment
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
      // Update inline
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
  const handleFollow = async (e) => {
    e.stopPropagation();
    try { await usersAPI.follow(post.author_id); addToast('Following!'); }
    catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div className="glass-card post-card fade-in" style={{ padding: '16px 0 0', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: '0 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="avatar" style={{ width: 48, height: 48, cursor: 'pointer', overflow: 'hidden' }} onClick={() => navigate(`/profile/${post.author_id}`)}>
            {author.avatar ? <img src={author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (author.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.author_id}`)}>{author.name || ''}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>{author.headline || ''}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>{timeAgo} · <Globe size={10} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isOwn && <button className="follow-btn-sm" onClick={handleFollow}><Plus size={14} /> Follow</button>}
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
      </div>

      {/* Caption or Edit Mode */}
      {editing ? (
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <textarea className="textarea-field" value={editText} onChange={e => setEditText(e.target.value)} style={{ minHeight: 60, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleEdit} style={{ padding: '6px 16px' }}>Save</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 16px', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 12 }}>
          {displayContent}
          {shouldTruncate && !expanded && <span className="see-more-btn" onClick={() => setExpanded(true)}>...see more</span>}
        </div>
      )}

      {/* Media */}
      {media.length > 0 && (
        <div style={{ position: 'relative', width: '100%', height: 500, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${media[currentImg]})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.3)', opacity: 0.5 }} />
          <img src={media[currentImg]} alt="" style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', zIndex: 2 }} />
          {media.length > 1 && (<>
            <button className="carousel-btn left" onClick={(e) => { e.stopPropagation(); setCurrentImg(p => (p - 1 + media.length) % media.length); }}><ChevronLeft size={24} /></button>
            <button className="carousel-btn right" onClick={(e) => { e.stopPropagation(); setCurrentImg(p => (p + 1) % media.length); }}><ChevronRight size={24} /></button>
            <div className="carousel-dots">{media.map((_, i) => <div key={i} className={`carousel-dot ${i === currentImg ? 'active' : ''}`} onClick={() => setCurrentImg(i)} />)}</div>
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

function FeedJobCard({ job }) {
  const navigate = useNavigate();
  return (
    <div className="glass-card feed-job-card fade-in" onClick={() => navigate('/jobs')} style={{ overflow: 'hidden' }}>
      {job.poster && (
        <div style={{ width: '100%', height: 160, marginBottom: 12, borderBottom: '1px solid var(--glass-border)', overflow: 'hidden' }}>
          <img src={job.poster} alt={`${job.title} Poster`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: job.poster ? '0 16px 16px' : 0 }}>
        <div className="feed-job-badge" style={job.poster ? {} : { marginBottom: 12 }}><Zap size={12} /> Job Opening</div>
        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{job.title}</h4>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{job.company?.name || job.company_name || 'Company'}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {job.location && <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {job.location}</span>}
          {job.salary_range && <span><DollarSign size={11} style={{ verticalAlign: 'middle' }} /> {job.salary_range}</span>}
          <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> {job.job_type}</span>
        </div>
      </div>
    </div>
  );
}

export default function Feed({ addToast }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [feedJobs, setFeedJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState({ people: [], companies: [] });
  const [loading, setLoading] = useState(true);

  const loadFeed = async () => {
    try {
      const res = await postsAPI.getFeed();
      setPosts(res.data || []);
      setFeedJobs(res.jobs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadFeed();
    usersAPI.platformStats().then(r => setStats(r.data)).catch(() => {});
    usersAPI.trendingSkills().then(r => setTrending(r.data || [])).catch(() => {});
    usersAPI.getRecommendations().then(r => setRecommendations(r.data || { people: [], companies: [] })).catch(() => {});
  }, []);

  const handleFollowRec = async (id, isCompany) => {
    try {
      await usersAPI.follow(id);
      addToast('Followed successfully!');
      setRecommendations(prev => ({
        ...prev,
        [isCompany ? 'companies' : 'people']: prev[isCompany ? 'companies' : 'people'].filter(r => r._id !== id)
      }));
    } catch (e) { addToast(e.message, 'error'); }
  };

  // Build a mixed feed: posts interleaved with job cards
  const buildMixedFeed = () => {
    const items = [];
    let jobIdx = 0;
    posts.forEach((p, i) => {
      items.push({ type: 'post', data: p, key: `p-${p._id}` });
      // Insert a job card after every 3rd post
      if ((i + 1) % 3 === 0 && jobIdx < feedJobs.length) {
        items.push({ type: 'job', data: feedJobs[jobIdx], key: `j-${feedJobs[jobIdx]._id}` });
        jobIdx++;
      }
    });
    // If no posts, still show jobs
    if (posts.length === 0) {
      feedJobs.forEach(j => items.push({ type: 'job', data: j, key: `j-${j._id}` }));
    }
    return items;
  };

  return (
    <div className="page-container">
      <div className="three-col">
        {/* Left Sidebar: Profile Card */}
        <div>
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ 
              height: 60, 
              background: user?.cover_photo ? `url(${user.cover_photo}) center/cover` : 'linear-gradient(135deg, rgba(108,92,231,0.4), rgba(168,85,247,0.3))' 
            }} />
            <div style={{ padding: '0 20px 20px', marginTop: -24, textAlign: 'center' }}>
              <div className="avatar" style={{ width: 48, height: 48, fontSize: '1.2rem', margin: '0 auto 8px', border: '3px solid var(--bg-card)', cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => navigate(`/profile/${user?.id}`)}>
                {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => navigate(`/profile/${user?.id}`)}>{user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>{user?.headline}</div>
              {user?.location && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 1, opacity: 0.8 }}>
                  <MapPin size={10} style={{ marginRight: 2 }} /> {user.location}
                </div>
              )}
              
              {user?.experience?.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--glass-border)', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Latest Experience</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user.experience[user.experience.length - 1].title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{user.experience[user.experience.length - 1].company}</div>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {(recommendations.people.length > 0 || recommendations.companies.length > 0) && (
            <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
              <div className="section-title" style={{ marginBottom: 16, fontSize: '0.85rem' }}><Users size={14} className="icon" style={{ marginRight: 6 }}/> Who to follow</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {recommendations.companies.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Suggested Companies</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {recommendations.companies.map(c => (
                        <div key={c._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div className="avatar" style={{ width: 42, height: 42, fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, borderRadius: 8 }} onClick={() => navigate(`/profile/${c._id}`)}>
                            {c.avatar ? <img src={c.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.name || 'C')[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => navigate(`/profile/${c._id}`)}>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{c.headline || 'Company'}</div>
                            {c.social_proof && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={10} /> {c.social_proof}</div>}
                            <button onClick={() => handleFollowRec(c._id, true)} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '20px', padding: '4px 14px', fontSize: '0.75rem', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}><Plus size={12} /> Follow</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recommendations.people.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>People you may know</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {recommendations.people.map(p => (
                        <div key={p._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div className="avatar" style={{ width: 42, height: 42, fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate(`/profile/${p._id}`)}>
                            {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.name || 'U')[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => navigate(`/profile/${p._id}`)}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{p.headline || 'Member'}</div>
                            {p.social_proof && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={10} /> {p.social_proof}</div>}
                            <button onClick={() => handleFollowRec(p._id, false)} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '20px', padding: '4px 14px', fontSize: '0.75rem', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}><Plus size={12} /> Follow</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center: Feed */}
        <div>
          <CreatePost onCreated={loadFeed} addToast={addToast} userName={user?.name} userAvatar={user?.avatar} />

          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                <div className="skeleton" style={{ width: '30%', height: 16, marginBottom: 12 }} />
                <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '70%', height: 14 }} />
              </div>
            ))
          ) : buildMixedFeed().length === 0 ? (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>No posts yet</p>
              <p style={{ fontSize: '0.85rem' }}>Be the first to share something!</p>
            </div>
          ) : (
            buildMixedFeed().map(item =>
              item.type === 'post'
                ? <PostCard key={item.key} post={item.data} addToast={addToast} onDeleted={loadFeed} />
                : <FeedJobCard key={item.key} job={item.data} />
            )
          )}
        </div>

        {/* Right Sidebar: Stats & Trending */}
        <div>
          {stats && (
            <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="section-title"><TrendingUp size={16} className="icon" />Platform Stats</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Users', stats.total_users?.[0]?.count || 0, Users],
                  ['Posts', stats.total_posts || 0, null],
                  ['Jobs', stats.total_jobs || 0, Briefcase],
                  ['AI Analyses', stats.total_analyses || 0, null],
                ].map(([label, value, Icon]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {Icon && <Icon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}{label}
                    </span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trending.length > 0 && (
            <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="section-title"><TrendingUp size={16} className="icon" />Trending Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trending.map((s, i) => <span key={i} className="chip chip-purple">{s.skill} ({s.count})</span>)}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
