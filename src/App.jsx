import { useEffect, useState, useRef } from "react";
import "./index.css";

const USERS_API = "https://69178edb21a96359486d501e.mockapi.io/all";
const POSTS_API = "https://jsonplaceholder.typicode.com/posts";
const ALBUMS_API = "https://jsonplaceholder.typicode.com/albums";
const PHOTOS_API = "https://jsonplaceholder.typicode.com/photos";

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState("");

  // Form states (user)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(""); // preview only
  const [avatarFile, setAvatarFile] = useState(null); // store the actual file
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Post form states
  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postLoading, setPostLoading] = useState(false);

  // Albums state
  const [albums, setAlbums] = useState([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const postTitleRef = useRef(null);

  /* ------------------------------------------------------------------ */
  /*  Avatar helpers                                                    */
  /* ------------------------------------------------------------------ */
  const generateAvatarUrl = (name) => {
    if (!name?.trim()) return null;
    const encoded = encodeURIComponent(name.trim());
    return `https://ui-avatars.com/api/?name=${encoded}&size=128&background=random&bold=true&format=png`;
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be < 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
      setAvatarFile(file); // Store the file for upload
      setError("");
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  };

  // Convert base64 to blob for upload (if needed for your API)
  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  /* ------------------------------------------------------------------ */
  /*  Dark mode toggle                                                  */
  /* ------------------------------------------------------------------ */
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("darkMode", newMode.toString());
      return newMode;
    });
  };

  /* ------------------------------------------------------------------ */
  /*  API calls                                                         */
  /* ------------------------------------------------------------------ */
  const loadUsers = async () => {
    setLoadingUsers(true);
    setError("");
    try {
      const res = await fetch(USERS_API);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.slice(0, 9));
    } catch (err) {
      setError("Failed to load users.");
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPosts = async (userId) => {
    setLoadingPosts(true);
    setError("");
    try {
      const res = await fetch(`${POSTS_API}?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      setError("Failed to load posts.");
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadAlbums = async (userId) => {
    setLoadingAlbums(true);
    setError("");
    try {
      const res = await fetch(`${ALBUMS_API}?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch albums");
      const albumsData = await res.json();

      const albumsWithThumb = await Promise.all(
        albumsData.map(async (album) => {
          const photoRes = await fetch(`${PHOTOS_API}?albumId=${album.id}&_limit=1`);
          const photos = await photoRes.json();
          return {
            ...album,
            thumbnailUrl: photos[0]?.thumbnailUrl || null,
          };
        })
      );

      setAlbums(albumsWithThumb);
    } catch (err) {
      setError("Failed to load albums.");
      console.error(err);
    } finally {
      setLoadingAlbums(false);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postBody.trim()) {
      setError("Title and body are required");
      return;
    }
    setPostLoading(true);
    const newPost = {
      title: postTitle.trim(),
      body: postBody.trim(),
      userId: selectedUser.id,
    };
    try {
      const res = await fetch(POSTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      });
      if (!res.ok) throw new Error("Failed to create post");
      const created = await res.json();
      setPosts((prev) => [{ ...created, id: Date.now() }, ...prev]);
      setPostTitle("");
      setPostBody("");
      setShowPostForm(false);
      setError("");
    } catch (err) {
      setError("Failed to create post.");
      console.error(err);
    } finally {
      setPostLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Effects                                                           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (showPostForm && postTitleRef.current) postTitleRef.current.focus();
  }, [showPostForm]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  /* ------------------------------------------------------------------ */
  /*  Modal helpers                                                     */
  /* ------------------------------------------------------------------ */
  const openUserPosts = (user) => {
    setSelectedUser(user);
    setPosts([]);
    setAlbums([]);
    setShowPostForm(false);
    setActiveTab("posts");
    loadPosts(user.id);
  };

  const closePosts = (e) => {
    if (e) e.stopPropagation();
    setSelectedUser(null);
    setPosts([]);
    setAlbums([]);
    setShowPostForm(false);
  };

  /* ------------------------------------------------------------------ */
  /*  Drag & drop                                                       */
  /* ------------------------------------------------------------------ */
  const handleFileChange = (e) => processFile(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget)) setIsDragging(false);
  };

  /* ------------------------------------------------------------------ */
  /*  Form submit (create / update)                                     */
  /* ------------------------------------------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email required");
      return;
    }

    setFormLoading(true);
    
    // Determine avatar URL - use preview if available, otherwise generate from name
    let avatarUrlForApi = avatarPreview || generateAvatarUrl(name.trim());

    const payload = {
      name: name.trim(),
      email: email.trim(),
      avatar: avatarUrlForApi,
      id: editId || Date.now(),
    };

    try {
      if (editId) {
        const res = await fetch(`${USERS_API}/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update user");
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === editId ? updated : u)));
      } else {
        const newUser = {
          ...payload,
          username: name.trim().toLowerCase().replace(/\s+/g, ""),
          address: { city: "Unknown" },
          company: { name: "Unknown" },
          createdAt: new Date().toISOString(),
        };
        const res = await fetch(USERS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser),
        });
        if (!res.ok) throw new Error("Failed to create user");
        const created = await res.json();
        setUsers((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError("Operation failed.");
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setAvatarPreview("");
    setAvatarFile(null);
    setEditId(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (user) => {
    setEditId(user.id);
    setName(user.name);
    setEmail(user.email);
    setAvatarPreview(user.avatar || generateAvatarUrl(user.name));
    setAvatarFile(null);
  };

  const cancelEdit = () => resetForm();

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    setFormLoading(true);
    try {
      await fetch(`${USERS_API}/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError("Delete failed.");
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Avatar component (with fallback)                                  */
  /* ------------------------------------------------------------------ */
  const Avatar = ({ user, size = 56 }) => {
    const saved = user?.avatar?.trim();
    const generated = generateAvatarUrl(user?.name);
    const { letter, bg, color } = generateLetterAvatar(user?.name);

    return (
      <div
        className="avatar"
        style={{
          width: size,
          height: size,
          background: saved ? "transparent" : bg,
          color,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: darkMode
            ? "0 4px 12px rgba(0,0,0,0.3)"
            : "0 4px 12px rgba(0,0,0,0.1)",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.45,
          fontWeight: "bold",
          border: darkMode ? "2px solid #374151" : "2px solid #e5e7eb",
        }}
      >
        {saved ? (
          <img
            src={saved}
            alt={user?.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
            onError={(e) => {
              e.target.src = generated || "";
            }}
          />
        ) : generated ? (
          <img
            src={generated}
            alt={user?.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          letter
        )}
      </div>
    );
  };

  const generateLetterAvatar = (name) => {
    const letter = name?.trim().charAt(0).toUpperCase() || "?";
    const hue = (letter.charCodeAt(0) * 37) % 360;
    const isDark = darkMode;
    return {
      letter,
      bg: `hsl(${hue}, ${isDark ? "50%" : "70%"}, ${isDark ? "30%" : "80%"})`,
      color: isDark ? `hsl(${hue}, 100%, 90%)` : `hsl(${hue}, 50%, 20%)`,
    };
  };

  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-lines">
        <div className="skeleton-line short"></div>
        <div className="skeleton-line long"></div>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* ---------- GLOBAL STYLES ---------- */}
      <style>{`
        :root { --primary:#007bff; --success:#28a745; --danger:#dc3545; --info:#17a2b8; --gray:#6c757d; --light:#f8f9fa; --dark:#343a40; }
        .dark-mode { --bg-primary:#1a1a1a; --bg-secondary:#2d2d2d; --bg-card:#374151; --text-primary:#f8f9fa; --text-secondary:#d1d5db; --text-muted:#9ca3af; --border-color:#4b5563; --shadow-color:rgba(0,0,0,0.3); }
        * { box-sizing:border-box; }
        body { margin:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:${darkMode ? "var(--bg-primary)" : "#f4f6f9"}; color:${darkMode ? "var(--text-primary)" : "#333"}; transition:background .3s,color .3s; }
        .container { max-width:680px; margin:auto; padding:24px 16px; }
        h1,h2,h3 { color:${darkMode ? "var(--text-primary)" : "#1a1a1a"}; }
        h1 { text-align:center; margin-bottom:32px; font-size:2rem; animation:fadeIn .6s ease-out; }
        .error { background:${darkMode ? "#fee" : "#2a0f0f"}; color:${darkMode ? "#c33" : "#fca5a5"}; padding:12px 16px; border-radius:8px; border:1px solid ${darkMode ? "#fcc" : "#7f1d1d"}; margin-bottom:16px; font-size:.95rem; animation:shake .4s ease-in-out; }
        .form-card,.post-form { background:${darkMode ? "var(--bg-card)" : "white"}; padding:24px; border-radius:16px; box-shadow:0 4px 20px ${darkMode ? "var(--shadow-color)" : "rgba(0,0,0,.08)"}; margin-bottom:20px; animation:fadeIn .5s ease-out; border:${darkMode ? "1px solid var(--border-color)" : "none"}; }
        .input,.textarea { width:100%; padding:12px 14px; margin-bottom:12px; border:1px solid ${darkMode ? "var(--border-color)" : "#ddd"}; border-radius:10px; font-size:1rem; transition:all .2s; outline:none; background:${darkMode ? "var(--bg-secondary)" : "white"}; color:${darkMode ? "var(--text-primary)" : "#333"}; }
        .input:focus,.textarea:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(0,123,255,.1); }
        .textarea { min-height:80px; resize:vertical; }
        .drop-zone { border:2px dashed ${isDragging ? "var(--primary)" : darkMode ? "#4b5563" : "#ccc"}; background:${isDragging ? "rgba(0,123,255,.05)" : darkMode ? "var(--bg-secondary)" : "transparent"}; padding:16px; border-radius:12px; text-align:center; margin-bottom:12px; cursor:pointer; transition:all .2s; color:${darkMode ? "var(--text-secondary)" : "#555"}; }
        .drop-zone p { margin:0 0 8px; font-size:.95rem; }
        .drop-zone small { color:${darkMode ? "var(--text-muted)" : "#999"}; font-size:.8rem; }
        .preview { display:flex; align-items:center; gap:12px; margin-bottom:16px; animation:fadeIn .3s; }
        .btn { padding:12px 16px; border:none; border-radius:10px; color:white; font-weight:600; font-size:1rem; cursor:pointer; transition:all .2s; }
        .btn:hover { filter:brightness(1.08); }
        .btn:active { transform:scale(.98); }
        .btn-primary { background:var(--primary); }
        .btn-secondary { background:var(--gray); }
        .btn-info { background:var(--info); }
        .btn-success { background:var(--success); }
        .btn-danger { background:var(--danger); }
        .btn-sm { padding:6px 12px; font-size:.85rem; border-radius:8px; }
        .user-card { display:flex; align-items:flex-start; background:${darkMode ? "var(--bg-card)" : "white"}; padding:16px; border-radius:12px; box-shadow:0 2px 10px ${darkMode ? "var(--shadow-color)" : "rgba(0,0,0,.06)"}; transition:all .2s; animation:fadeIn .4s ease-out; border:${darkMode ? "1px solid var(--border-color)" : "none"}; }
        .user-card:hover { transform:translateY(-2px); box-shadow:0 8px 20px ${darkMode ? "var(--shadow-color)" : "rgba(0,0,0,.1)"}; }
        .user-info { flex:1; min-width:0; }
        .user-info h3 { margin:0 0 4px; font-size:1.1rem; color:${darkMode ? "var(--text-primary)" : "#1a1a1a"}; }
        .user-info p { margin:0 0 4px; color:${darkMode ? "var(--text-secondary)" : "#555"}; font-size:.95rem; }
        .user-info small { color:${darkMode ? "var(--text-muted)" : "#888"}; font-size:.85rem; }
        .actions { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
        .actions-row { display:flex; gap:8px; }
        .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; animation:fadeIn .3s ease-out; }
        .modal-content { background:${darkMode ? "var(--bg-card)" : "white"}; width:90%; max-width:600px; max-height:85vh; border-radius:16px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,.2); animation:slideIn .3s ease-out; border:${darkMode ? "1px solid var(--border-color)" : "none"}; }
        .modal-header { padding:20px 24px; border-bottom:1px solid ${darkMode ? "var(--border-color)" : "#eee"}; display:flex; align-items:center; gap:12px; }
        .modal-header h3 { margin:0; font-size:1.3rem; color:${darkMode ? "var(--text-primary)" : "#1a1a1a"}; }
        .modal-header p { margin:4px 0 0; color:${darkMode ? "var(--text-secondary)" : "#666"}; font-size:.95rem; }
        .modal-close { margin-left:auto; background:none; border:none; font-size:1.5rem; cursor:pointer; color:${darkMode ? "var(--text-muted)" : "#999"}; }
        .modal-body { padding:20px 24px; max-height:60vh; overflow-y:auto; background:${darkMode ? "var(--bg-secondary)" : "transparent"}; }
        .tab-bar { display:flex; border-bottom:1px solid ${darkMode ? "var(--border-color)" : "#eee"}; margin:-20px -24px 20px; }
        .tab-btn { flex:1; padding:12px; background:none; border:none; font-weight:600; font-size:1rem; cursor:pointer; color:${darkMode ? "var(--text-muted)" : "#777"}; transition:color .2s; }
        .tab-btn.active { color:var(--primary); border-bottom:3px solid var(--primary); }
        .tab-btn:hover { color:var(--primary); }
        .album-grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); }
        .album-card { background:${darkMode ? "var(--bg-primary)" : "#f8f9fa"}; border-radius:8px; overflow:hidden; text-align:center; padding:8px; border:${darkMode ? "1px solid var(--border-color)" : "none"}; }
        .album-thumb { width:100%; height:80px; object-fit:cover; border-radius:6px; margin-bottom:6px; }
        .album-title { font-size:.85rem; color:${darkMode ? "var(--text-primary)" : "#333"}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .post-card { background:${darkMode ? "var(--bg-primary)" : "#f8f9fa"}; padding:16px; border-radius:12px; margin-bottom:12px; border-left:4px solid var(--primary); transition:transform .2s; border:${darkMode ? "1px solid var(--border-color)" : "none"}; }
        .post-card:hover { transform:translateX(4px); }
        .post-card h4 { margin:0 0 8px; font-size:1.1rem; color:${darkMode ? "var(--text-primary)" : "#1a1a1a"}; }
        .post-card p { margin:0; color:${darkMode ? "var(--text-secondary)" : "#555"}; font-size:.95rem; line-height:1.5; }
        .spinner { width:48px; height:48px; border:4px solid ${darkMode ? "#374151" : "#f3f3f3"}; border-top:4px solid var(--primary); border-radius:50%; animation:spin 1s linear infinite; margin:auto 16px; }
        .skeleton-card { display:flex; align-items:flex-start; padding:16px; background:${darkMode ? "var(--bg-card)" : "white"}; border-radius:12px; box-shadow:0 2px 8px ${darkMode ? "var(--shadow-color)" : "rgba(0,0,0,.05)"}; margin-bottom:12px; animation:fadeIn .3s; }
        .skeleton-avatar { width:56px; height:56px; border-radius:50%; background:${darkMode ? "#4b5563" : "#e2e8f0"}; animation:pulse 1.5s infinite; margin-right:16px; }
        .skeleton-lines { flex:1; }
        .skeleton-line { height:16px; background:${darkMode ? "#4b5563" : "#e2e8f0"}; border-radius:4px; margin-bottom:8px; animation:pulse 1.5s infinite; }
        .skeleton-line.short { width:60%; }
        .skeleton-line.long { width:85%; }
        .avatar:hover { transform:scale(1.08); box-shadow:0 8px 20px ${darkMode ? "rgba(0,0,0,.4)" : "rgba(0,0,0,.15)"}; }
        .dark-mode-toggle { position:fixed; top:20px; right:20px; background:${darkMode ? "var(--bg-card)" : "white"}; border:1px solid ${darkMode ? "var(--border-color)" : "#ddd"}; border-radius:50%; width:50px; height:50px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 10px ${darkMode ? "var(--shadow-color)" : "rgba(0,0,0,.1)"}; z-index:1000; transition:all .3s ease; }
        .dark-mode-toggle:hover { transform:scale(1.1); }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        @keyframes pulse { 0%{background-color:${darkMode ? "#4b5563" : "#e2e8f0"}} 50%{background-color:${darkMode ? "#6b7280" : "#edf2f7"}} 100%{background-color:${darkMode ? "#4b5563" : "#e2e8f0"}} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ---------- Dark-mode toggle ---------- */}
      <button className="dark-mode-toggle" onClick={toggleDarkMode} title={darkMode ? "Light mode" : "Dark mode"}>
        {darkMode ? "Sun" : "Moon"}
      </button>

      <div className="container">
        <h1>User Manager</h1>
        {error && <div className="error">{error}</div>}

        {/* ---------- User form ---------- */}
        <form onSubmit={handleSubmit} className="form-card">
          <h2>{editId ? "Edit User" : "Add New User"}</h2>

          <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required disabled={formLoading} className="input" />
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={formLoading} className="input" />

          <div ref={dropZoneRef} className="drop-zone" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            <p>{isDragging ? "Drop image here" : "Click or drag image here"}</p>
            <small>Max 5 MB, PNG/JPG/GIF</small>
          </div>

          {(avatarPreview || name) && (
            <div className="preview">
              <Avatar user={{ name: name || "?", avatar: avatarPreview || generateAvatarUrl(name) }} />
              <div>
                <div style={{ fontWeight: 500, color: darkMode ? "var(--text-primary)" : "#333" }}>Preview</div>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview("");
                      setAvatarFile(null);
                      fileInputRef.current.value = "";
                    }}
                    style={{ background: "none", border: "none", color: "#e53e3e", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ flex: 1, opacity: formLoading ? 0.7 : 1 }}>
              {formLoading ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit} disabled={formLoading} className="btn btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* ---------- Users list ---------- */}
        <h2 style={{ margin: "0 0 16px" }}>Users ({users.length})</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {loadingUsers ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : users.length === 0 ? (
            <p style={{ textAlign: "center", color: darkMode ? "var(--text-muted)" : "#888", fontStyle: "italic" }}>
              No users yet. Create one!
            </p>
          ) : (
            users.map((user, idx) => (
              <div key={user.id} className="user-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                <Avatar user={user} />
                <div className="user-info">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  {user.username && <small>@{user.username}</small>}
                  {user.createdAt && <small>Joined: {new Date(user.createdAt).toLocaleDateString()}</small>}
                </div>
                <div className="actions">
                  <button onClick={() => openUserPosts(user)} className="btn btn-info btn-sm">
                    Posts
                  </button>
                  <div className="actions-row">
                    <button onClick={() => startEdit(user)} disabled={formLoading} className="btn btn-success btn-sm">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(user.id)} disabled={formLoading} className="btn btn-danger btn-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---------- Posts / Albums modal ---------- */}
      {selectedUser && (
        <div className="modal-backdrop" onClick={closePosts}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Avatar user={selectedUser} size={48} />
              <div>
                <h3>{selectedUser.name}</h3>
                <p>@{selectedUser.username || "user"}</p>
              </div>
              <button onClick={closePosts} className="modal-close">
                ×
              </button>
            </div>

            <div className="tab-bar">
              <button
                className={`tab-btn ${activeTab === "posts" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("posts");
                  if (posts.length === 0) loadPosts(selectedUser.id);
                }}
              >
                Posts
              </button>
              <button
                className={`tab-btn ${activeTab === "albums" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("albums");
                  if (albums.length === 0) loadAlbums(selectedUser.id);
                }}
              >
                Albums
              </button>
            </div>

            <div className="modal-body">
              {/* ---- Posts ---- */}
              {activeTab === "posts" && (
                <>
                  <button onClick={() => setShowPostForm(true)} className="btn btn-success" style={{ width: "100%", marginBottom: 16 }}>
                    Add New Post
                  </button>

                  {showPostForm && (
                    <form onSubmit={createPost} className="post-form">
                      <input ref={postTitleRef} type="text" placeholder="Post Title" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} required className="input" disabled={postLoading} />
                      <textarea placeholder="Post Body" value={postBody} onChange={(e) => setPostBody(e.target.value)} required className="textarea" disabled={postLoading} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" disabled={postLoading} className="btn btn-primary" style={{ flex: 1 }}>
                          {postLoading ? "Posting..." : "Publish"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPostForm(false);
                            setPostTitle("");
                            setPostBody("");
                          }}
                          disabled={postLoading}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {loadingPosts ? (
                    <div style={{ textAlign: "center", padding: 32 }}>
                      <div className="spinner"></div>
                      <p style={{ color: darkMode ? "var(--text-secondary)" : "#666" }}>Loading posts...</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <p style={{ textAlign: "center", color: darkMode ? "var(--text-muted)" : "#888", fontStyle: "italic" }}>No posts yet.</p>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} className="post-card">
                        <h4>{post.title}</h4>
                        <p>{post.body}</p>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* ---- Albums ---- */}
              {activeTab === "albums" && (
                <>
                  {loadingAlbums ? (
                    <div style={{ textAlign: "center", padding: 32 }}>
                      <div className="spinner"></div>
                      <p style={{ color: darkMode ? "var(--text-secondary)" : "#666" }}>Loading albums...</p>
                    </div>
                  ) : albums.length === 0 ? (
                    <p style={{ textAlign: "center", color: darkMode ? "var(--text-muted)" : "#888", fontStyle: "italic" }}>No albums yet.</p>
                  ) : (
                    <div className="album-grid">
                      {albums.map((album) => (
                        <div key={album.id} className="album-card">
                          {album.thumbnailUrl ? (
                            <img src={album.thumbnailUrl} alt={album.title} className="album-thumb" />
                          ) : (
                            <div
                              style={{
                                height: 80,
                                background: darkMode ? "#4b5563" : "#e2e8f0",
                                borderRadius: 6,
                                marginBottom: 6,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: darkMode ? "#9ca3af" : "#999",
                              }}
                            >
                              No Image
                            </div>
                          )}
                          <div className="album-title" title={album.title}>
                            {album.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;