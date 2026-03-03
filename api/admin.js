import { useState } from "react";

const PLAN_COLORS = {
  free: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  pro:  { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  team: { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE" },
};

async function callAdmin(password, action, extra = {}) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action, ...extra }),
  });
  return res.json();
}

export default function AdminPage() {
  const [password, setPassword]     = useState("");
  const [authed, setAuthed]         = useState(false);
  const [authError, setAuthError]   = useState("");
  const [users, setUsers]           = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const [updating, setUpdating]     = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [search, setSearch]         = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [toast, setToast]           = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async (pw) => {
    setLoading(true);
    const data = await callAdmin(pw, "get_stats");
    if (data.error === "Unauthorised") {
      setAuthError("Wrong password. Try again.");
      setLoading(false);
      return;
    }
    if (data.error) {
      setAuthError("Error: " + data.error);
      setLoading(false);
      return;
    }
    setUsers(data.users || []);
    setStats(data.stats || {});
    setAuthed(true);
    setAuthError("");
    setLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    loadData(password);
  };

  const updatePlan = async (userId, plan) => {
    setUpdating(userId);
    const data = await callAdmin(password, "update_plan", { userId, plan });
    if (data.success) {
      const updated = users.map((u) => u.id === userId ? { ...u, plan } : u);
      setUsers(updated);
      const pro  = updated.filter(u => u.plan === "pro").length;
      const team = updated.filter(u => u.plan === "team").length;
      setStats((s) => ({ ...s, pro, team, free: updated.filter(u => u.plan === "free").length, mrrGBP: (pro * 15) + (team * 39), mrrUSD: (pro * 19) + (team * 49) }));
      showToast(`✓ Plan updated to ${plan.toUpperCase()}`);
    } else {
      showToast("Update failed.", false);
    }
    setUpdating(null);
  };

  const deleteUser = async (userId) => {
    setDeleting(userId);
    const data = await callAdmin(password, "delete_user", { userId });
    if (data.success) {
      const updated = users.filter((u) => u.id !== userId);
      setUsers(updated);
      const pro  = updated.filter(u => u.plan === "pro").length;
      const team = updated.filter(u => u.plan === "team").length;
      setStats((s) => ({ ...s, total: updated.length, pro, team, free: updated.filter(u => u.plan === "free").length, mrrGBP: (pro * 15) + (team * 39), mrrUSD: (pro * 19) + (team * 49) }));
      showToast("User deleted.");
    } else {
      showToast("Delete failed.", false);
    }
    setDeleting(null);
    setConfirmDelete(null);
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  // ── LOGIN ──────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h1 style={{ color: "#F8FAFC", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>PostLift Admin</h1>
          <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 28px" }}>Restricted access only</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${authError ? "#EF4444" : "#334155"}`, background: "#0F172A", color: "#F8FAFC", fontSize: 15, outline: "none", marginBottom: 8, boxSizing: "border-box" }}
              autoFocus
            />
            {authError && (
              <p style={{ color: "#EF4444", fontSize: 13, margin: "0 0 12px", textAlign: "left" }}>{authError}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "13px 0", background: loading ? "#334155" : "#F97316", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 8 }}
            >
              {loading ? "Checking..." : "Enter Dashboard →"}
            </button>
          </form>
          <p style={{ color: "#334155", fontSize: 12, marginTop: 24, lineHeight: 1.7 }}>
            Forgot your password?<br />
            <span style={{ color: "#64748B" }}>Vercel → Settings → Environment Variables → <strong>ADMIN_PASSWORD</strong></span>
          </p>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: toast.ok ? "#10B981" : "#EF4444", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 1000, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 380, width: "90%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Delete User?</h3>
            <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 24px" }}>
              Permanently delete <strong>{confirmDelete.email}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "11px 0", background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                Cancel
              </button>
              <button
                onClick={() => deleteUser(confirmDelete.id)}
                disabled={deleting === confirmDelete.id}
                style={{ flex: 1, padding: "11px 0", background: "#EF4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
              >
                {deleting === confirmDelete.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#0F172A", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🚀</span>
          <span style={{ color: "#F8FAFC", fontSize: 18, fontWeight: 900 }}>
            Post<span style={{ color: "#F97316" }}>Lift</span>{" "}
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 400 }}>Admin Dashboard</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => loadData(password)} style={{ padding: "8px 16px", background: "#1E293B", color: "#94A3B8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            🔄 Refresh
          </button>
          <button onClick={() => { setAuthed(false); setPassword(""); setUsers([]); setStats(null); }} style={{ padding: "8px 16px", background: "transparent", color: "#64748B", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Log out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Stats cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Users",  value: stats?.total,              color: "#3B82F6", emoji: "👥" },
            { label: "Free Plan",    value: stats?.free,               color: "#10B981", emoji: "🆓" },
            { label: "Pro Plan",     value: stats?.pro,                color: "#F97316", emoji: "⭐" },
            { label: "Team Plan",    value: stats?.team,               color: "#8B5CF6", emoji: "🏢" },
            { label: "MRR (GBP)",    value: `£${stats?.mrrGBP || 0}`,  color: "#0EA5E9", emoji: "💷" },
            { label: "MRR (USD)",    value: `$${stats?.mrrUSD || 0}`,  color: "#0EA5E9", emoji: "💵" },
            { label: "Saved Posts",  value: stats?.totalPosts,         color: "#64748B", emoji: "📝" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.emoji}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value ?? 0}</div>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <input
            placeholder="🔍  Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "10px 16px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 14, outline: "none", background: "#fff" }}
          />
          {["all", "free", "pro", "team"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlan(p)}
              style={{
                padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: filterPlan === p ? 700 : 500, cursor: "pointer",
                border: `1.5px solid ${filterPlan === p ? "#F97316" : "#E2E8F0"}`,
                background: filterPlan === p ? "#FFF7ED" : "#fff",
                color: filterPlan === p ? "#F97316" : "#64748B",
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}{p !== "all" ? ` (${stats?.[p] ?? 0})` : ""}
            </button>
          ))}
        </div>

        {/* Users table */}
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr 110px 90px 220px 60px", padding: "13px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.6px" }}>
            <span>NAME</span><span>EMAIL</span><span>PLAN</span><span>POSTS</span><span>CHANGE PLAN</span><span>DEL</span>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: "48px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No users found.</div>
          )}

          {filtered.map((user, i) => {
            const pc = PLAN_COLORS[user.plan] || PLAN_COLORS.free;
            const joined = new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
            return (
              <div key={user.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr 110px 90px 220px 60px", padding: "14px 24px", borderBottom: i < filtered.length - 1 ? "1px solid #F1F5F9" : "none", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: "#1E293B" }}>{user.name || "—"}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>Joined {joined}</p>
                </div>
                <div style={{ fontSize: 13, color: "#334155", wordBreak: "break-all", paddingRight: 8 }}>{user.email}</div>
                <div>
                  <span style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                    {(user.plan || "free").toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "#334155", fontWeight: 600 }}>{user.posts_used ?? 0}</div>
                <div style={{ display: "flex", gap: 5 }}>
                  {["free", "pro", "team"].map((p) => (
                    <button
                      key={p}
                      disabled={user.plan === p || updating === user.id}
                      onClick={() => updatePlan(user.id, p)}
                      style={{
                        padding: "5px 9px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                        cursor: user.plan === p || updating === user.id ? "not-allowed" : "pointer",
                        border: `1.5px solid ${user.plan === p ? PLAN_COLORS[p].border : "#E2E8F0"}`,
                        background: user.plan === p ? PLAN_COLORS[p].bg : "#F8FAFC",
                        color: user.plan === p ? PLAN_COLORS[p].text : "#94A3B8",
                        opacity: updating === user.id ? 0.5 : 1,
                      }}
                    >
                      {updating === user.id ? "…" : p.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div>
                  <button
                    onClick={() => setConfirmDelete(user)}
                    style={{ padding: "5px 9px", background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ color: "#94A3B8", fontSize: 12, marginTop: 14, textAlign: "center" }}>
          Showing {filtered.length} of {users.length} registered users
        </p>
      </div>
    </div>
  );
}
