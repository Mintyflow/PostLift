import React, { useState } from "react";
import ReactDOM from "react-dom/client";

const C = {
  bg:"#0d0f14", card:"#161922", raised:"#1c2030",
  border:"rgba(255,255,255,0.07)", borderA:"rgba(200,117,51,0.35)",
  amber:"#c87533", amberD:"#a8622c", amberL:"#d98840",
  text:"#e8ecf4", mid:"#9ca3af", dim:"#606878",
  green:"#22c55e", red:"#ef4444", white:"#ffffff",
};
const GRAD_AMBER = "linear-gradient(135deg,#c87533,#a8622c)";

async function callAdmin(password, action, extra = {}) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action, ...extra }),
  });
  return res.json();
}

function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [changingPlan, setChangingPlan] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function login() {
    setLoading(true);
    setErr("");
    try {
      const res = await callAdmin(password, "get_stats");
      if (res.error) { setErr(res.error); setLoading(false); return; }
      setData(res);
      setAuthed(true);
      setLoading(false);
    } catch (e) {
      setErr("Could not connect.");
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await callAdmin(password, "get_stats");
      if (!res.error) setData(res);
      setLoading(false);
    } catch (e) { setLoading(false); }
  }

  async function updatePlan(userId, plan) {
    setChangingPlan(userId);
    const res = await callAdmin(password, "update_plan", { userId, plan });
    if (res.success) {
      showToast("Plan updated to " + plan.toUpperCase());
    } else {
      showToast("Update failed", false);
    }
    setChangingPlan(null);
    refresh();
  }

  async function deleteUser(userId) {
    const res = await callAdmin(password, "delete_user", { userId });
    if (res.success) {
      showToast("User deleted");
    } else {
      showToast("Delete failed", false);
    }
    setConfirmDel(null);
    refresh();
  }

  // ── LOGIN SCREEN ──
  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "20px", fontFamily: "'Segoe UI',system-ui,sans-serif"
      }}>
        <div style={{
          background: C.card, border: "1px solid " + C.border, borderRadius: "16px",
          padding: "40px 36px", width: "100%", maxWidth: "380px"
        }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔐</div>
            <h1 style={{ color: C.text, fontWeight: "900", fontSize: "22px", margin: "0 0 4px" }}>
              Post<span style={{ color: C.amber }}>Lift</span> Admin
            </h1>
            <p style={{ color: C.dim, fontSize: "13px", margin: 0 }}>Restricted access only</p>
          </div>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && login()}
            autoFocus
            style={{
              width: "100%", padding: "12px 16px", borderRadius: "10px",
              border: "1.5px solid " + (err ? C.red : C.border),
              background: "rgba(255,255,255,0.05)", color: C.text,
              fontSize: "15px", marginBottom: "8px", boxSizing: "border-box", outline: "none"
            }}
          />
          {err && <p style={{ color: C.red, fontSize: "13px", margin: "0 0 12px", textAlign: "left" }}>{err}</p>}
          <button
            onClick={login}
            disabled={loading}
            style={{
              width: "100%", padding: "13px 0", background: loading ? C.dim : GRAD_AMBER,
              color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px",
              fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", marginTop: "8px"
            }}
          >
            {loading ? "Checking..." : "Enter Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──
  const { stats, users = [] } = data || {};
  const filtered = users.filter(u => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || (u.email + (u.name || "")).toLowerCase().includes(q);
    const matchFilter = filter === "all" || (u.plan || "free") === filter;
    return matchSearch && matchFilter;
  });

  const planColor = { free: C.dim, pro: C.amber, team: "#a78bfa" };
  const planBg = { free: "rgba(255,255,255,0.05)", pro: "rgba(200,117,51,0.15)", team: "rgba(167,139,250,0.15)" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1000,
          background: toast.ok ? C.green : C.red, color: "#fff",
          padding: "12px 20px", borderRadius: "10px", fontWeight: "600",
          fontSize: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
        }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDel && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999
        }}>
          <div style={{
            background: C.card, border: "1px solid " + C.border, borderRadius: "16px",
            padding: "32px 28px", maxWidth: "380px", width: "90%", textAlign: "center"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "800", color: C.text }}>Delete User?</h3>
            <p style={{ color: C.dim, fontSize: "14px", margin: "0 0 24px" }}>
              Permanently delete <strong style={{ color: C.text }}>{confirmDel.email}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirmDel(null)}
                style={{
                  flex: 1, padding: "11px 0", background: C.raised, color: C.mid,
                  border: "1px solid " + C.border, borderRadius: "8px", fontWeight: "600",
                  cursor: "pointer", fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(confirmDel.id)}
                style={{
                  flex: 1, padding: "11px 0", background: "rgba(239,68,68,0.2)",
                  color: C.red, border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px",
                  fontWeight: "700", cursor: "pointer", fontSize: "14px"
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div style={{
        background: C.card, borderBottom: "1px solid " + C.border,
        padding: "16px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: "12px"
      }}>
        <div>
          <h1 style={{ color: C.text, fontWeight: "900", fontSize: "20px", margin: "0 0 2px" }}>
            Post<span style={{ color: C.amber }}>Lift</span>{" "}
            <span style={{ color: C.dim, fontSize: "13px", fontWeight: "400" }}>Admin Dashboard</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={refresh}
            style={{
              padding: "8px 16px", borderRadius: "8px", border: "1px solid " + C.border,
              background: "transparent", color: C.mid, fontSize: "12px", cursor: "pointer", fontWeight: "700"
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => { setAuthed(false); setPassword(""); setData(null); }}
            style={{
              padding: "8px 16px", borderRadius: "8px", border: "1px solid " + C.border,
              background: "transparent", color: C.dim, fontSize: "12px", cursor: "pointer"
            }}
          >
            Log out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 20px" }}>

        {/* Stats cards */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: "12px", marginBottom: "28px"
        }}>
          {[
            { label: "Total Users", value: stats?.total || 0, icon: "👥", color: C.text },
            { label: "Free Users", value: stats?.free || 0, icon: "🆓", color: C.dim },
            { label: "Pro Users", value: stats?.pro || 0, icon: "⭐", color: C.amber },
            { label: "Team Users", value: stats?.team || 0, icon: "👑", color: "#a78bfa" },
            { label: "New This Week", value: stats?.newThisWeek || 0, icon: "📈", color: C.green },
            { label: "MRR (GBP)", value: "\u00A3" + (stats?.mrrGBP || 0), icon: "💰", color: C.text },
            { label: "MRR (USD)", value: "$" + (stats?.mrrUSD || 0), icon: "💵", color: C.text },
          ].map(s => (
            <div key={s.label} style={{
              background: C.card, border: "1px solid " + C.border, borderRadius: "12px", padding: "18px"
            }}>
              <div style={{ fontSize: "22px", marginBottom: "6px" }}>{s.icon}</div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: C.dim, marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search and filter */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: "220px", padding: "10px 14px", borderRadius: "8px",
              border: "1px solid " + C.border, background: "rgba(255,255,255,0.05)",
              color: C.text, fontSize: "13px", outline: "none"
            }}
          />
          {["all", "free", "pro", "team"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "10px 16px", borderRadius: "8px",
                border: "1px solid " + (filter === f ? C.amber : C.border),
                background: filter === f ? "rgba(200,117,51,0.15)" : "transparent",
                color: filter === f ? C.amber : C.dim,
                fontWeight: "700", fontSize: "12px", cursor: "pointer", textTransform: "capitalize"
              }}
            >
              {f === "all" ? "All Plans" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "all" && ` (${stats?.[f] ?? 0})`}
            </button>
          ))}
        </div>

        {/* Users table */}
        <div style={{
          background: C.card, border: "1px solid " + C.border, borderRadius: "14px", overflow: "hidden"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + C.border }}>
                  {["Name", "Email", "Plan", "Posts Used", "Joined", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left", fontSize: "11px",
                      color: C.dim, fontWeight: "700", textTransform: "uppercase",
                      letterSpacing: "0.5px", whiteSpace: "nowrap"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} style={{
                    borderBottom: i < filtered.length - 1 ? "1px solid " + C.border : "none",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"
                  }}>
                    <td style={{ padding: "12px 16px", color: C.text, fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap" }}>
                      {u.name || "\u2014"}
                    </td>
                    <td style={{ padding: "12px 16px", color: C.mid, fontSize: "12px", wordBreak: "break-all" }}>
                      {u.email}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <select
                        value={u.plan || "free"}
                        disabled={changingPlan === u.id}
                        onChange={e => updatePlan(u.id, e.target.value)}
                        style={{
                          padding: "5px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700",
                          background: planBg[u.plan] || planBg.free,
                          color: planColor[u.plan] || planColor.free,
                          border: "1px solid " + (planColor[u.plan] || planColor.free) + "44",
                          cursor: changingPlan === u.id ? "not-allowed" : "pointer",
                          opacity: changingPlan === u.id ? 0.5 : 1,
                          textTransform: "capitalize", outline: "none",
                          appearance: "none", WebkitAppearance: "none",
                          paddingRight: "24px",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 6px center"
                        }}
                      >
                        <option value="free" style={{ background: C.card, color: C.text }}>Free</option>
                        <option value="pro" style={{ background: C.card, color: C.text }}>Pro</option>
                        <option value="team" style={{ background: C.card, color: C.text }}>Team</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px 16px", color: C.mid, fontSize: "13px" }}>
                      {u.posts_used || 0}
                    </td>
                    <td style={{ padding: "12px 16px", color: C.dim, fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => setConfirmDel(u)}
                        style={{
                          padding: "5px 12px", borderRadius: "6px",
                          border: "1px solid rgba(239,68,68,0.3)", background: "transparent",
                          color: C.red, fontSize: "11px", cursor: "pointer", fontWeight: "700"
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: C.dim, fontSize: "13px" }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "12px", color: C.dim, fontSize: "11px" }}>
          Showing {filtered.length} of {users.length} users
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminDashboard />
  </React.StrictMode>
);
