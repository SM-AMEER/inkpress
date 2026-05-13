import { useState, useEffect, useRef } from "react";

// ─── Persistent Storage Helpers ───────────────────────────────────────────────
const DB = {
  async get(key) {
    try { const r = await window.storage.get(key, false); return r ? JSON.parse(r.value) : null; } catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val), false); } catch {}
  },
};

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_USERS = [
  { id: "u1", username: "ameer", password: "1234", avatar: "AM", bio: "Founder @ Ariyom Tech Solutions. Building the future." },
  { id: "u2", username: "priya", password: "1234", avatar: "PR", bio: "Full-stack developer & coffee aficionado." },
];
const SEED_POSTS = [
  {
    id: "p1", authorId: "u1", title: "Why I Built an AI Crash Detection App",
    excerpt: "A deep dive into the technical decisions behind CrashGuard — from accelerometer physics to silent SMS alerts.",
    body: `Building CrashGuard started with a simple question: what if your phone could save your life in an accident?\n\nThe core challenge was physics. Detecting a real crash without false positives from potholes or speed bumps required careful thresholding of accelerometer magnitude: √(x²+y²+z²). A genuine impact registers above 2.5g — well beyond any normal bump.\n\nBeyond detection, the SOS chain had to be bulletproof: silent SMS via Fast2SMS, auto-dial via react-native-immediate-phone-call, and audio alerts through expo-av with forced speakerphone. Each layer required deep dives into Android permissions and background task management.\n\nThe biggest lesson? Real-world safety apps demand an obsession with reliability, not just features.`,
    tags: ["React Native", "AI", "Safety"], createdAt: Date.now() - 86400000 * 5, likes: ["u2"],
  },
  {
    id: "p2", authorId: "u2", title: "The JWT Bug That Cost Me Two Days",
    excerpt: "How a single line of Node.js brought down my entire auth system — and what I learned from it.",
    body: `It was a one-line fix. require('dotenv').config() needed to be the very first line of server.js. Instead, it was buried after the imports — meaning JWT_SECRET was undefined by the time the auth middleware ran.\n\nEvery login attempt returned 500. Every token verification failed silently. The logs showed nothing useful because the error was upstream of everything.\n\nThe fix took 30 seconds. The diagnosis took 48 hours.\n\nMoral: always load your environment variables before anything else. Put dotenv config at the absolute top of your entry point — no exceptions.`,
    tags: ["Node.js", "Auth", "Debugging"], createdAt: Date.now() - 86400000 * 2, likes: [],
  },
];
const SEED_COMMENTS = [
  { id: "c1", postId: "p1", authorId: "u2", body: "The g-force thresholding approach is really clever. Did you account for motorcycles?", createdAt: Date.now() - 86400000 * 4 },
  { id: "c2", postId: "p1", authorId: "u1", body: "Great point! Motorcycle profiles are on the roadmap — different vibration signatures entirely.", createdAt: Date.now() - 86400000 * 3 },
  { id: "c3", postId: "p2", authorId: "u1", body: "The silent dotenv bug has claimed so many victims. Should be in every Node.js tutorial.", createdAt: Date.now() - 86400000 * 1 },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ─── AI Helper ────────────────────────────────────────────────────────────────
async function askAI(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0f0e0c;
    --paper: #f5f0e8;
    --cream: #ede8dc;
    --accent: #c8392b;
    --muted: #8a8070;
    --border: #d4cfc4;
    --gold: #b5872a;
    --white: #faf8f4;
  }

  body { background: var(--paper); color: var(--ink); font-family: 'Crimson Pro', Georgia, serif; }

  .bp-root { min-height: 100vh; background: var(--paper); }

  /* ── Masthead ── */
  .masthead {
    border-bottom: 3px double var(--ink);
    padding: 0 2rem;
    background: var(--white);
    position: sticky; top: 0; z-index: 100;
  }
  .masthead-inner {
    max-width: 1100px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 0;
  }
  .brand {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem; font-weight: 900; letter-spacing: -1px;
    color: var(--ink); cursor: pointer; user-select: none;
  }
  .brand span { color: var(--accent); }
  .nav-links { display: flex; align-items: center; gap: 1.5rem; }
  .nav-btn {
    background: none; border: none; cursor: pointer;
    font-family: 'Crimson Pro', serif; font-size: 0.95rem;
    color: var(--muted); transition: color .2s;
    letter-spacing: 0.03em;
  }
  .nav-btn:hover { color: var(--ink); }
  .nav-btn.primary {
    background: var(--ink); color: var(--paper);
    padding: 0.45rem 1.1rem; font-size: 0.9rem;
    border: 1px solid var(--ink);
  }
  .nav-btn.primary:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
  .avatar-chip {
    width: 34px; height: 34px; border-radius: 50%;
    background: var(--ink); color: var(--paper);
    font-family: 'Playfair Display', serif; font-size: 0.75rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: 2px solid transparent; transition: border-color .2s;
  }
  .avatar-chip:hover { border-color: var(--accent); }

  /* ── Hero ── */
  .hero {
    border-bottom: 1px solid var(--border);
    padding: 3rem 2rem 2.5rem;
    background: var(--white);
    text-align: center;
  }
  .hero-date {
    font-size: 0.8rem; letter-spacing: 0.15em; text-transform: uppercase;
    color: var(--muted); margin-bottom: 0.75rem;
  }
  .hero-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 900; line-height: 1;
    color: var(--ink); margin-bottom: 0.5rem;
  }
  .hero-sub {
    font-style: italic; color: var(--muted); font-size: 1.1rem;
    max-width: 500px; margin: 0 auto;
  }
  .hero-divider {
    display: flex; align-items: center; gap: 1rem;
    margin: 1.5rem auto 0; max-width: 300px;
  }
  .hero-divider::before, .hero-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }
  .hero-divider-icon { color: var(--accent); font-size: 1.2rem; }

  /* ── Layout ── */
  .layout { max-width: 1100px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 1fr 300px; gap: 3rem; }
  @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }

  /* ── Post Cards ── */
  .posts-list { display: flex; flex-direction: column; gap: 0; }
  .post-card {
    padding: 2rem 0; border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background .15s;
  }
  .post-card:hover .post-card-title { color: var(--accent); }
  .post-card-meta {
    display: flex; align-items: center; gap: 0.75rem;
    margin-bottom: 0.6rem; font-size: 0.82rem; color: var(--muted);
  }
  .post-card-author {
    display: flex; align-items: center; gap: 0.4rem; font-weight: 600; color: var(--ink);
  }
  .mini-avatar {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--ink); color: var(--paper);
    font-size: 0.6rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .post-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem; font-weight: 700; line-height: 1.25;
    margin-bottom: 0.5rem; transition: color .2s; color: var(--ink);
  }
  .post-card-excerpt {
    font-size: 1rem; color: var(--muted); line-height: 1.6;
    margin-bottom: 0.75rem; font-style: italic;
  }
  .post-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .tag {
    font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase;
    border: 1px solid var(--border); padding: 0.2rem 0.55rem;
    color: var(--muted); background: transparent;
    font-family: 'Crimson Pro', serif;
  }
  .post-card-footer {
    display: flex; align-items: center; gap: 1rem;
    margin-top: 0.75rem; font-size: 0.82rem; color: var(--muted);
  }
  .like-btn {
    background: none; border: none; cursor: pointer;
    font-size: 0.82rem; color: var(--muted); display: flex; align-items: center; gap: 0.3rem;
    font-family: 'Crimson Pro', serif; transition: color .2s; padding: 0;
  }
  .like-btn:hover, .like-btn.liked { color: var(--accent); }

  /* ── Sidebar ── */
  .sidebar { position: sticky; top: 5rem; align-self: start; }
  .sidebar-section { margin-bottom: 2rem; }
  .sidebar-heading {
    font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase;
    color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem;
    font-family: 'Playfair Display', serif;
  }
  .write-btn {
    width: 100%; background: var(--ink); color: var(--paper);
    border: none; cursor: pointer; padding: 0.9rem;
    font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700;
    letter-spacing: 0.05em; transition: background .2s;
  }
  .write-btn:hover { background: var(--accent); }
  .sidebar-author {
    display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;
  }
  .sidebar-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--ink); color: var(--paper);
    font-family: 'Playfair Display', serif; font-size: 0.9rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .sidebar-author-name { font-weight: 600; font-size: 0.95rem; }
  .sidebar-author-bio { font-size: 0.85rem; color: var(--muted); font-style: italic; line-height: 1.4; }
  .recent-post-link {
    display: block; padding: 0.4rem 0; border-bottom: 1px solid var(--cream);
    font-size: 0.9rem; color: var(--ink); cursor: pointer; transition: color .2s;
    font-family: 'Crimson Pro', serif;
  }
  .recent-post-link:hover { color: var(--accent); }

  /* ── Post Detail ── */
  .post-detail { max-width: 700px; margin: 0 auto; padding: 2rem; }
  .back-btn {
    background: none; border: none; cursor: pointer;
    color: var(--muted); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;
    font-family: 'Crimson Pro', serif; margin-bottom: 2rem; padding: 0;
  }
  .back-btn:hover { color: var(--accent); }
  .post-detail-title {
    font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 2.8rem);
    font-weight: 900; line-height: 1.15; margin-bottom: 1rem; color: var(--ink);
  }
  .post-detail-meta {
    display: flex; align-items: center; gap: 1rem; font-size: 0.85rem;
    color: var(--muted); margin-bottom: 1.5rem; border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border); padding: 0.75rem 0;
  }
  .post-detail-body {
    font-size: 1.15rem; line-height: 1.8; color: var(--ink);
    white-space: pre-wrap; font-style: normal;
  }
  .post-detail-body p { margin-bottom: 1.2rem; }

  /* ── Comments ── */
  .comments-section { margin-top: 3rem; padding-top: 2rem; border-top: 3px double var(--ink); }
  .comments-heading {
    font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700;
    margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;
  }
  .comments-count {
    font-size: 0.8rem; background: var(--ink); color: var(--paper);
    padding: 0.15rem 0.5rem; font-family: 'Crimson Pro', serif; font-weight: 400;
  }
  .comment-item {
    margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--cream);
  }
  .comment-header { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; }
  .comment-author { font-weight: 600; font-size: 0.9rem; }
  .comment-time { font-size: 0.78rem; color: var(--muted); }
  .comment-body { font-size: 0.98rem; line-height: 1.6; color: var(--ink); }
  .comment-delete-btn {
    background: none; border: none; cursor: pointer;
    color: var(--border); font-size: 0.8rem; margin-left: auto;
    transition: color .2s; font-family: 'Crimson Pro', serif;
  }
  .comment-delete-btn:hover { color: var(--accent); }
  .comment-form { margin-top: 1.5rem; }
  .comment-form textarea {
    width: 100%; border: 1px solid var(--border); background: var(--white);
    padding: 0.75rem; font-family: 'Crimson Pro', serif; font-size: 1rem;
    resize: vertical; min-height: 90px; color: var(--ink); outline: none;
    transition: border-color .2s;
  }
  .comment-form textarea:focus { border-color: var(--ink); }
  .comment-form-footer {
    display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;
  }
  .submit-btn {
    background: var(--ink); color: var(--paper); border: none; cursor: pointer;
    padding: 0.55rem 1.3rem; font-family: 'Playfair Display', serif;
    font-size: 0.9rem; transition: background .2s;
  }
  .submit-btn:hover { background: var(--accent); }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Post Actions ── */
  .post-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .action-btn {
    background: none; border: 1px solid var(--border); cursor: pointer;
    padding: 0.45rem 1rem; font-family: 'Crimson Pro', serif; font-size: 0.88rem;
    color: var(--muted); transition: all .2s;
  }
  .action-btn:hover { border-color: var(--ink); color: var(--ink); }
  .action-btn.danger:hover { border-color: var(--accent); color: var(--accent); }
  .action-btn.liked { color: var(--accent); border-color: var(--accent); }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(15,14,12,.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; backdrop-filter: blur(2px); padding: 1rem;
  }
  .modal {
    background: var(--white); width: 100%; max-width: 560px;
    border: 1px solid var(--border); max-height: 90vh; overflow-y: auto;
  }
  .modal-header {
    padding: 1.5rem 1.5rem 0;
    border-bottom: 1px solid var(--cream); margin-bottom: 1.5rem; padding-bottom: 1rem;
    display: flex; justify-content: space-between; align-items: center;
  }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; }
  .modal-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.3rem; color: var(--muted); line-height: 1;
  }
  .modal-close:hover { color: var(--accent); }
  .modal-body { padding: 0 1.5rem 1.5rem; }
  .field { margin-bottom: 1.2rem; }
  .field label {
    display: block; font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--muted); margin-bottom: 0.4rem; font-family: 'Playfair Display', serif;
  }
  .field input, .field textarea, .field select {
    width: 100%; border: 1px solid var(--border); background: var(--paper);
    padding: 0.65rem 0.75rem; font-family: 'Crimson Pro', serif; font-size: 1rem;
    color: var(--ink); outline: none; transition: border-color .2s;
  }
  .field input:focus, .field textarea:focus { border-color: var(--ink); }
  .field textarea { resize: vertical; min-height: 160px; }
  .modal-footer { display: flex; gap: 0.75rem; justify-content: flex-end; }
  .err-msg { color: var(--accent); font-size: 0.85rem; margin-bottom: 0.75rem; font-style: italic; }

  /* ── AI Assist ── */
  .ai-assist-row { display: flex; gap: 0.5rem; margin-top: 0.4rem; }
  .ai-btn {
    background: none; border: 1px solid var(--gold); cursor: pointer;
    padding: 0.3rem 0.7rem; font-size: 0.78rem; color: var(--gold);
    font-family: 'Crimson Pro', serif; transition: all .2s; white-space: nowrap;
  }
  .ai-btn:hover { background: var(--gold); color: var(--white); }
  .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ai-thinking { font-size: 0.82rem; color: var(--gold); font-style: italic; }

  /* ── Auth tabs ── */
  .auth-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 1.2rem; }
  .auth-tab {
    flex: 1; background: none; border: none; cursor: pointer;
    padding: 0.65rem; font-family: 'Playfair Display', serif; font-size: 1rem;
    color: var(--muted); transition: all .2s; border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
  .auth-tab.active { color: var(--ink); border-bottom-color: var(--accent); }

  /* ── Toast ── */
  .toast {
    position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
    background: var(--ink); color: var(--paper);
    padding: 0.75rem 1.25rem; font-family: 'Crimson Pro', serif; font-size: 0.95rem;
    animation: slideUp .25s ease; max-width: 320px;
  }
  .toast.success { background: #2a7c4f; }
  .toast.error { background: var(--accent); }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* ── Empty ── */
  .empty { text-align: center; padding: 3rem 1rem; color: var(--muted); font-style: italic; font-size: 1.1rem; }

  /* ── Loader ── */
  .spinner {
    width: 20px; height: 20px; border: 2px solid var(--border);
    border-top-color: var(--gold); border-radius: 50%;
    animation: spin .7s linear infinite; display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function BlogPlatform() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("home"); // home | post
  const [selectedPost, setSelectedPost] = useState(null);
  const [modal, setModal] = useState(null); // auth | write | edit
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap
  useEffect(() => {
    (async () => {
      let u = await DB.get("bp:users");
      let p = await DB.get("bp:posts");
      let c = await DB.get("bp:comments");
      if (!u) { u = SEED_USERS; await DB.set("bp:users", u); }
      if (!p) { p = SEED_POSTS; await DB.set("bp:posts", p); }
      if (!c) { c = SEED_COMMENTS; await DB.set("bp:comments", c); }
      const cu = await DB.get("bp:session");
      setUsers(u); setPosts(p); setComments(c);
      if (cu) setCurrentUser(cu);
      setLoading(false);
    })();
  }, []);

  const saveUsers = async (u) => { setUsers(u); await DB.set("bp:users", u); };
  const savePosts = async (p) => { setPosts(p); await DB.set("bp:posts", p); };
  const saveComments = async (c) => { setComments(c); await DB.set("bp:comments", c); };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const login = async (user) => {
    setCurrentUser(user); await DB.set("bp:session", user);
    setModal(null); showToast(`Welcome back, ${user.username}!`);
  };
  const logout = async () => {
    setCurrentUser(null); await DB.set("bp:session", null);
    setView("home"); showToast("Signed out.");
  };

  const userOf = (id) => users.find(u => u.id === id);
  const commentsOf = (pid) => comments.filter(c => c.postId === pid);

  return (
    <>
      <style>{css}</style>
      <div className="bp-root">
        {/* Masthead */}
        <header className="masthead">
          <div className="masthead-inner">
            <div className="brand" onClick={() => setView("home")}>The<span>Ink</span>Press</div>
            <nav className="nav-links">
              {currentUser ? (
                <>
                  <button className="nav-btn" onClick={() => setModal("write")}>+ Write</button>
                  <div className="avatar-chip" title={currentUser.username} onClick={logout}>{currentUser.avatar}</div>
                </>
              ) : (
                <>
                  <button className="nav-btn" onClick={() => setModal("auth")}>Sign In</button>
                  <button className="nav-btn primary" onClick={() => setModal("auth")}>Join</button>
                </>
              )}
            </nav>
          </div>
        </header>

        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : view === "home" ? (
          <HomeView posts={posts} users={users} comments={comments} currentUser={currentUser}
            savePosts={savePosts} setView={setView} setSelectedPost={setSelectedPost}
            setModal={setModal} showToast={showToast} />
        ) : (
          <PostView post={selectedPost} posts={posts} users={users} comments={comments}
            currentUser={currentUser} savePosts={savePosts} saveComments={saveComments}
            setView={setView} setModal={setModal} setSelectedPost={setSelectedPost}
            showToast={showToast} />
        )}

        {/* Modals */}
        {modal === "auth" && (
          <AuthModal users={users} saveUsers={saveUsers} login={login} close={() => setModal(null)} showToast={showToast} />
        )}
        {(modal === "write" || modal?.type === "edit") && (
          <PostModal post={modal?.type === "edit" ? modal.post : null}
            posts={posts} savePosts={savePosts}
            currentUser={currentUser} close={() => setModal(null)} showToast={showToast}
            onSaved={(p) => { setSelectedPost(p); setView("post"); }} />
        )}

        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    </>
  );
}

// ─── Home View ────────────────────────────────────────────────────────────────
function HomeView({ posts, users, comments, currentUser, savePosts, setView, setSelectedPost, setModal, showToast }) {
  const userOf = (id) => users.find(u => u.id === id);
  const sorted = [...posts].sort((a, b) => b.createdAt - a.createdAt);

  const toggleLike = async (post) => {
    if (!currentUser) { showToast("Sign in to like posts.", "error"); return; }
    const likes = post.likes.includes(currentUser.id)
      ? post.likes.filter(id => id !== currentUser.id)
      : [...post.likes, currentUser.id];
    const updated = posts.map(p => p.id === post.id ? { ...p, likes } : p);
    await savePosts(updated);
  };

  return (
    <>
      <div className="hero">
        <div className="hero-date">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
        <div className="hero-title">The InkPress</div>
        <div className="hero-sub">Ideas worth writing. Stories worth reading.</div>
        <div className="hero-divider"><span className="hero-divider-icon">✦</span></div>
      </div>
      <div className="layout">
        <main>
          {sorted.length === 0 ? <p className="empty">No posts yet. Be the first to write.</p> : (
            <div className="posts-list">
              {sorted.map(post => {
                const author = userOf(post.authorId);
                const liked = currentUser && post.likes.includes(currentUser.id);
                return (
                  <article key={post.id} className="post-card" onClick={() => { setSelectedPost(post); setView("post"); }}>
                    <div className="post-card-meta">
                      <span className="post-card-author">
                        <span className="mini-avatar">{author?.avatar}</span>
                        {author?.username}
                      </span>
                      <span>·</span>
                      <span>{fmt(post.createdAt)}</span>
                      <span>·</span>
                      <span>{comments.filter(c => c.postId === post.id).length} comments</span>
                    </div>
                    <h2 className="post-card-title">{post.title}</h2>
                    <p className="post-card-excerpt">{post.excerpt}</p>
                    <div className="post-tags">{post.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
                    <div className="post-card-footer" onClick={e => e.stopPropagation()}>
                      <button className={`like-btn ${liked ? "liked" : ""}`} onClick={() => toggleLike(post)}>
                        {liked ? "♥" : "♡"} {post.likes.length}
                      </button>
                      <span>✎ Read more</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
        <aside className="sidebar">
          {currentUser && (
            <div className="sidebar-section">
              <p className="sidebar-heading">Your Voice</p>
              <div className="sidebar-author">
                <div className="sidebar-avatar">{currentUser.avatar}</div>
                <div>
                  <div className="sidebar-author-name">{currentUser.username}</div>
                  <div className="sidebar-author-bio">{userOf(currentUser.id)?.bio}</div>
                </div>
              </div>
              <button className="write-btn" onClick={() => setModal("write")}>Write a New Post</button>
            </div>
          )}
          <div className="sidebar-section">
            <p className="sidebar-heading">Recent Posts</p>
            {sorted.slice(0, 5).map(p => (
              <span key={p.id} className="recent-post-link" onClick={() => { setSelectedPost(p); setView("post"); }}>
                {p.title}
              </span>
            ))}
          </div>
          <div className="sidebar-section">
            <p className="sidebar-heading">Writers</p>
            {users.map(u => (
              <div key={u.id} className="sidebar-author" style={{ marginBottom: "0.6rem" }}>
                <div className="mini-avatar" style={{ width: 28, height: 28, fontSize: "0.65rem" }}>{u.avatar}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{u.username}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                    {posts.filter(p => p.authorId === u.id).length} posts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

// ─── Post View ────────────────────────────────────────────────────────────────
function PostView({ post, posts, users, comments, currentUser, savePosts, saveComments, setView, setModal, setSelectedPost, showToast }) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const author = users.find(u => u.id === post.authorId);
  const postComments = comments.filter(c => c.postId === post.id).sort((a, b) => a.createdAt - b.createdAt);
  const isOwner = currentUser?.id === post.authorId;
  const liked = currentUser && post.likes.includes(currentUser.id);

  // Re-sync post from posts list
  const livePost = posts.find(p => p.id === post.id) || post;

  const toggleLike = async () => {
    if (!currentUser) { showToast("Sign in to like posts.", "error"); return; }
    const likes = livePost.likes.includes(currentUser.id)
      ? livePost.likes.filter(id => id !== currentUser.id)
      : [...livePost.likes, currentUser.id];
    const updated = posts.map(p => p.id === livePost.id ? { ...p, likes } : p);
    await savePosts(updated);
    setSelectedPost({ ...livePost, likes });
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    if (!currentUser) { showToast("Sign in to comment.", "error"); return; }
    setSubmitting(true);
    const nc = { id: uid(), postId: post.id, authorId: currentUser.id, body: commentText.trim(), createdAt: Date.now() };
    await saveComments([...comments, nc]);
    setCommentText(""); setSubmitting(false);
    showToast("Comment posted!");
  };

  const deleteComment = async (cid) => {
    await saveComments(comments.filter(c => c.id !== cid));
    showToast("Comment deleted.");
  };

  const deletePost = async () => {
    if (!window.confirm("Delete this post?")) return;
    await savePosts(posts.filter(p => p.id !== post.id));
    setView("home"); showToast("Post deleted.");
  };

  return (
    <div className="post-detail">
      <button className="back-btn" onClick={() => setView("home")}>← Back to Feed</button>
      <div className="post-tags" style={{ marginBottom: "0.75rem" }}>
        {livePost.tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
      <h1 className="post-detail-title">{livePost.title}</h1>
      <div className="post-detail-meta">
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="mini-avatar" style={{ width: 26, height: 26 }}>{author?.avatar}</span>
          <strong>{author?.username}</strong>
        </span>
        <span>·</span>
        <span>{fmt(livePost.createdAt)}</span>
        <span>·</span>
        <span>{postComments.length} comments</span>
        <span>·</span>
        <span>{livePost.likes.length} likes</span>
      </div>

      <div className="post-detail-body">
        {livePost.body.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
      </div>

      <div className="post-actions">
        <button className={`action-btn ${(currentUser && livePost.likes.includes(currentUser.id)) ? "liked" : ""}`} onClick={toggleLike}>
          {(currentUser && livePost.likes.includes(currentUser.id)) ? "♥" : "♡"} {livePost.likes.length} Likes
        </button>
        {isOwner && <>
          <button className="action-btn" onClick={() => setModal({ type: "edit", post: livePost })}>Edit Post</button>
          <button className="action-btn danger" onClick={deletePost}>Delete</button>
        </>}
      </div>

      {/* Comments */}
      <div className="comments-section">
        <div className="comments-heading">
          Comments <span className="comments-count">{postComments.length}</span>
        </div>

        {postComments.length === 0 && <p className="empty" style={{ textAlign: "left", padding: "1rem 0" }}>No comments yet. Start the conversation.</p>}

        {postComments.map(c => {
          const cu = users.find(u => u.id === c.authorId);
          const canDelete = currentUser?.id === c.authorId || currentUser?.id === post.authorId;
          return (
            <div key={c.id} className="comment-item">
              <div className="comment-header">
                <span className="mini-avatar">{cu?.avatar}</span>
                <span className="comment-author">{cu?.username}</span>
                <span className="comment-time">{timeAgo(c.createdAt)}</span>
                {canDelete && <button className="comment-delete-btn" onClick={() => deleteComment(c.id)}>✕</button>}
              </div>
              <p className="comment-body">{c.body}</p>
            </div>
          );
        })}

        {currentUser ? (
          <div className="comment-form">
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Share your thoughts…" />
            <div className="comment-form-footer">
              <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>
                Commenting as <strong>{currentUser.username}</strong>
              </span>
              <button className="submit-btn" onClick={submitComment} disabled={submitting || !commentText.trim()}>
                {submitting ? "Posting…" : "Post Comment"}
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontStyle: "italic", color: "var(--muted)", fontSize: "0.95rem" }}>
            <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setModal("auth")}>Sign in</span> to join the conversation.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ users, saveUsers, login, close, showToast }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", bio: "" });
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleLogin = () => {
    const u = users.find(x => x.username === form.username.trim() && x.password === form.password);
    if (!u) { setErr("Invalid username or password."); return; }
    login(u);
  };

  const handleRegister = async () => {
    if (!form.username.trim() || !form.password) { setErr("Username and password required."); return; }
    if (users.find(x => x.username === form.username.trim())) { setErr("Username taken."); return; }
    const initials = form.username.trim().slice(0, 2).toUpperCase();
    const nu = { id: uid(), username: form.username.trim(), password: form.password, avatar: initials, bio: form.bio || "Writer." };
    const updated = [...users, nu];
    await saveUsers(updated);
    login(nu);
    showToast("Account created! Welcome.");
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Join TheInkPress</span>
          <button className="modal-close" onClick={close}>×</button>
        </div>
        <div className="modal-body">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setErr(""); }}>Sign In</button>
            <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => { setTab("register"); setErr(""); }}>Create Account</button>
          </div>
          {err && <div className="err-msg">{err}</div>}
          <div className="field"><label>Username</label><input value={form.username} onChange={set("username")} placeholder="your_name" /></div>
          <div className="field"><label>Password</label><input type="password" value={form.password} onChange={set("password")} placeholder="••••••" /></div>
          {tab === "register" && <div className="field"><label>Bio (optional)</label><input value={form.bio} onChange={set("bio")} placeholder="A sentence about yourself…" /></div>}
          <div className="modal-footer">
            <button className="submit-btn" onClick={tab === "login" ? handleLogin : handleRegister}>
              {tab === "login" ? "Sign In" : "Create Account"}
            </button>
          </div>
          {tab === "login" && <p style={{ marginTop: "1rem", fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>
            Demo: username <strong>ameer</strong> or <strong>priya</strong>, password <strong>1234</strong>
          </p>}
        </div>
      </div>
    </div>
  );
}

// ─── Post Modal ───────────────────────────────────────────────────────────────
function PostModal({ post, posts, savePosts, currentUser, close, showToast, onSaved }) {
  const isEdit = !!post;
  const [form, setForm] = useState({
    title: post?.title || "",
    excerpt: post?.excerpt || "",
    body: post?.body || "",
    tags: post?.tags?.join(", ") || "",
  });
  const [aiLoading, setAiLoading] = useState(null);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const aiImprove = async (field, prompt) => {
    if (!form[field]) { showToast("Write something first!", "error"); return; }
    setAiLoading(field);
    try {
      const result = await askAI(
        "You are an expert editorial assistant for a literary blog. Improve the given text. Respond ONLY with the improved text — no preamble, no explanation.",
        `${prompt}:\n\n${form[field]}`
      );
      setForm(f => ({ ...f, [field]: result.trim() }));
      showToast("AI improved your text ✦");
    } catch { showToast("AI unavailable.", "error"); }
    setAiLoading(null);
  };

  const generateExcerpt = async () => {
    if (!form.body) { showToast("Write your body first!", "error"); return; }
    setAiLoading("excerpt");
    try {
      const result = await askAI(
        "You are an editorial assistant. Write a single compelling 1-2 sentence excerpt/teaser for the blog post. Respond ONLY with the excerpt.",
        `Blog post body:\n\n${form.body}`
      );
      setForm(f => ({ ...f, excerpt: result.trim() }));
      showToast("Excerpt generated ✦");
    } catch { showToast("AI unavailable.", "error"); }
    setAiLoading(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) { showToast("Title and body required.", "error"); return; }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    if (isEdit) {
      const updated = posts.map(p => p.id === post.id ? { ...p, ...form, tags } : p);
      await savePosts(updated);
      onSaved({ ...post, ...form, tags });
      showToast("Post updated.");
    } else {
      const np = {
        id: uid(), authorId: currentUser.id,
        title: form.title.trim(), excerpt: form.excerpt.trim(),
        body: form.body.trim(), tags,
        createdAt: Date.now(), likes: [],
      };
      await savePosts([...posts, np]);
      onSaved(np);
      showToast("Post published! ✦");
    }
    close();
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? "Edit Post" : "Write a New Post"}</span>
          <button className="modal-close" onClick={close}>×</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={set("title")} placeholder="A headline that demands to be read" />
            <div className="ai-assist-row">
              <button className="ai-btn" disabled={!!aiLoading} onClick={() => aiImprove("title", "Improve this blog post title to be more compelling and editorial")}>
                {aiLoading === "title" ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1 }} /> Improving…</> : "✦ AI Improve Title"}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Body</label>
            <textarea value={form.body} onChange={set("body")} placeholder="Tell your story…" style={{ minHeight: 200 }} />
            <div className="ai-assist-row">
              <button className="ai-btn" disabled={!!aiLoading} onClick={() => aiImprove("body", "Improve and polish this blog post body while preserving the author's voice. Make it more engaging, clear, and well-structured")}>
                {aiLoading === "body" ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1 }} /> Polishing…</> : "✦ AI Polish Writing"}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Excerpt</label>
            <input value={form.excerpt} onChange={set("excerpt")} placeholder="A teaser that makes readers click…" />
            <div className="ai-assist-row">
              <button className="ai-btn" disabled={!!aiLoading} onClick={generateExcerpt}>
                {aiLoading === "excerpt" ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1 }} /> Generating…</> : "✦ Generate from Body"}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Tags (comma-separated)</label>
            <input value={form.tags} onChange={set("tags")} placeholder="React, Node.js, Tutorial" />
          </div>

          <div className="modal-footer">
            <button className="action-btn" onClick={close}>Cancel</button>
            <button className="submit-btn" onClick={handleSave}>{isEdit ? "Save Changes" : "Publish Post"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
