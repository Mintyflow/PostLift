const RESEND_API = process.env.RESEND_API_KEY;
const FROM = "PostLift <apps@marvanova.com>";
const ADMIN_EMAIL = "marvin@marvanova.com";
const BASE_URL = "https://trypostlift.com";

async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API}` },
    body: JSON.stringify({ from: FROM, to, subject, html })
  });
  return res.json();
}

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',system-ui,sans-serif;color:#e8ecf4}
  .wrap{max-width:580px;margin:0 auto;padding:32px 16px}
  .card{background:#1a1d27;border:1px solid #2a2d3a;border-radius:16px;padding:32px}
  .logo{font-size:22px;font-weight:900;margin-bottom:28px}
  .logo span{color:#c87533}
  h1{font-size:22px;font-weight:900;margin:0 0 12px;color:#e8ecf4}
  p{font-size:14px;line-height:1.7;color:#9ca3af;margin:0 0 16px}
  .btn{display:inline-block;background:linear-gradient(135deg,#c87533,#e8934a);color:#fff;
    font-weight:700;font-size:14px;padding:13px 28px;border-radius:9px;text-decoration:none;margin:8px 0}
  .stat{background:#12141c;border:1px solid #2a2d3a;border-radius:10px;padding:16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
  .stat-val{font-size:22px;font-weight:900;color:#c87533}
  .stat-lbl{font-size:12px;color:#6b7280}
  .divider{border:none;border-top:1px solid #2a2d3a;margin:24px 0}
  .footer{text-align:center;font-size:11px;color:#4b5563;margin-top:24px;line-height:1.8}
  .tip{background:rgba(200,117,51,0.08);border:1px solid rgba(200,117,51,0.2);border-radius:10px;padding:16px;margin:16px 0}
  .tip-title{font-size:13px;font-weight:700;color:#c87533;margin-bottom:6px}
</style></head><body>
<div class="wrap"><div class="card">
<div class="logo">Post<span>Lift</span></div>
${content}
<hr class="divider">
<div class="footer">
  PostLift by Marvanova · <a href="${BASE_URL}/unsubscribe" style="color:#4b5563">Unsubscribe</a><br>
  Marvanova, Sevenoaks, Kent, UK
</div>
</div></div></body></html>`;
}

export async function sendWelcomeEmail(name, email) {
  const subject = `Welcome to PostLift, ${name.split(" ")[0]}! 🚀`;
  const html = baseTemplate(`
    <h1>You're in! Let's get your first post live 🎉</h1>
    <p>Hi ${name.split(" ")[0]},</p>
    <p>Welcome to PostLift — you've just unlocked the fastest way to create LinkedIn posts that actually get engagement.</p>
    <p>You have <strong style="color:#c87533">5 free post generations</strong> this month. Here's how to get the most out of them:</p>
    <div class="tip">
      <div class="tip-title">💡 Pro tip for your first generation</div>
      <p style="margin:0;font-size:13px">Be specific with your topic. Instead of "AI in business", try "How I used AI to cut my weekly reporting time by 3 hours". Specific beats generic every time.</p>
    </div>
    <p>Ready to generate your first post?</p>
    <a href="${BASE_URL}" class="btn">Generate my first post →</a>
    <p style="margin-top:20px">Any questions? Just reply to this email — I read every one.</p>
    <p>Marvin<br><span style="color:#6b7280;font-size:12px">Founder, PostLift</span></p>
  `);
  return sendEmail(email, subject, html);
}

export async function sendDay3Email(name, email) {
  const subject = `${name.split(" ")[0]}, here's what's working on LinkedIn right now`;
  const html = baseTemplate(`
    <h1>3 LinkedIn post formats getting the most engagement in 2025</h1>
    <p>Hi ${name.split(" ")[0]},</p>
    <p>It's been a few days since you joined PostLift, so I wanted to share what's actually working on LinkedIn right now based on our users' top-performing posts.</p>
    <div class="tip">
      <div class="tip-title">🔥 #1 — The Contrarian Take</div>
      <p style="margin:0;font-size:13px">"Everyone says X. I disagree. Here's why..." posts consistently get 3-5x more comments than standard advice posts. Use PostLift's Hot Take style.</p>
    </div>
    <div class="tip">
      <div class="tip-title">📖 #2 — The Personal Story</div>
      <p style="margin:0;font-size:13px">Posts that start with "3 years ago I..." or "Last week something happened..." outperform listicles by 40%. Use the Story style in PostLift.</p>
    </div>
    <div class="tip">
      <div class="tip-title">❓ #3 — The Honest Question</div>
      <p style="margin:0;font-size:13px">Asking a genuine question your audience actually debates drives comments like nothing else. Use the Question style and watch engagement climb.</p>
    </div>
    <p>All three of these are available in your free account right now.</p>
    <a href="${BASE_URL}" class="btn">Generate a post using these styles →</a>
    <p>Marvin</p>
  `);
  return sendEmail(email, subject, html);
}

export async function sendDay7Email(name, email) {
  const subject = `${name.split(" ")[0]}, you've been on PostLift for a week 🎯`;
  const html = baseTemplate(`
    <h1>Ready to go unlimited?</h1>
    <p>Hi ${name.split(" ")[0]},</p>
    <p>You've been using PostLift for a week now. If LinkedIn content has felt easier this week, that's exactly what we're here for.</p>
    <p>With PostLift Pro, you get:</p>
    <ul style="color:#9ca3af;font-size:14px;line-height:2">
      <li><strong style="color:#e8ecf4">Unlimited post generations</strong> — no monthly cap</li>
      <li><strong style="color:#e8ecf4">Post Improver</strong> — rewrite any post to make it better</li>
      <li><strong style="color:#e8ecf4">Content Library</strong> — save and organise your best posts</li>
      <li><strong style="color:#e8ecf4">8 more premium tools</strong> coming soon</li>
    </ul>
    <p>All for less than a coffee per week.</p>
    <a href="${BASE_URL}/pricing" class="btn">Upgrade to Pro — £15/month →</a>
    <p style="font-size:12px;color:#6b7280">Cancel anytime. No contracts.</p>
    <p>Marvin</p>
  `);
  return sendEmail(email, subject, html);
}

export async function sendReEngagementEmail(name, email) {
  const subject = `${name.split(" ")[0]}, we miss you 👋`;
  const html = baseTemplate(`
    <h1>Your LinkedIn audience is still waiting</h1>
    <p>Hi ${name.split(" ")[0]},</p>
    <p>We noticed you haven't generated any posts in a while. That's fine — life gets busy. But your LinkedIn audience is still there, and consistent posting is what builds momentum.</p>
    <p>Here's a quick topic idea to get you started again:</p>
    <div class="tip">
      <div class="tip-title">💡 Try this today</div>
      <p style="margin:0;font-size:13px">Write about one thing you've learned or done differently in the last 2 weeks. It doesn't need to be groundbreaking — authenticity beats perfection every time.</p>
    </div>
    <p>Takes 30 seconds to generate. Give it a go?</p>
    <a href="${BASE_URL}" class="btn">Generate a post now →</a>
    <p>Marvin</p>
  `);
  return sendEmail(email, subject, html);
}

export async function sendWeeklyStatsEmail(stats) {
  const { total, newThisWeek, free, pro, team, mrrGBP, mrrUSD, topUsers, trends } = stats;
  const subject = `PostLift Weekly Stats — ${new Date().toLocaleDateString("en-GB", {day:"numeric",month:"short"})}`;
  const html = baseTemplate(`
    <h1>Your weekly PostLift stats 📊</h1>
    <p>Here's what happened this week:</p>
    <div class="stat"><div><div class="stat-lbl">Total Users</div><div class="stat-val">${total}</div></div><div style="color:#22c55e;font-size:13px;font-weight:700">+${newThisWeek} this week</div></div>
    <div class="stat"><div><div class="stat-lbl">Free Users</div><div class="stat-val">${free}</div></div></div>
    <div class="stat"><div><div class="stat-lbl">Pro Users</div><div class="stat-val">${pro}</div></div></div>
    <div class="stat"><div><div class="stat-lbl">Team Users</div><div class="stat-val">${team}</div></div></div>
    <div class="stat"><div><div class="stat-lbl">MRR (GBP)</div><div class="stat-val">£${mrrGBP}</div></div><div style="font-size:12px;color:#6b7280">$${mrrUSD} USD</div></div>
    ${topUsers && topUsers.length > 0 ? `
    <hr class="divider">
    <h2 style="font-size:16px;font-weight:800;color:#e8ecf4;margin:0 0 12px">Most Active Users</h2>
    ${topUsers.map(u=>`<div class="stat"><div><div style="font-size:13px;font-weight:700;color:#e8ecf4">${u.name}</div><div class="stat-lbl">${u.email}</div></div><div style="text-align:right"><div class="stat-val" style="font-size:16px">${u.posts_used}</div><div class="stat-lbl">posts</div></div></div>`).join("")}
    ` : ""}
    ${trends ? `
    <hr class="divider">
    <div class="tip">
      <div class="tip-title">📈 Trend this week</div>
      <p style="margin:0;font-size:13px">${trends}</p>
    </div>` : ""}
    <hr class="divider">
    <p style="font-size:12px">View full dashboard: <a href="${BASE_URL}/admin" style="color:#c87533">${BASE_URL}/admin</a></p>
  `);
  return sendEmail(ADMIN_EMAIL, subject, html);
}

export async function sendAdminNotification(event, name, email, plan) {
  const icons = { signup: "👤", upgrade: "💰", cancel: "😢" };
  const titles = { signup: "New signup!", upgrade: "New paid subscriber!", cancel: "Cancellation" };
  const colors = { signup: "#22c55e", upgrade: "#c87533", cancel: "#f87171" };
  const icon = icons[event] || "📬";
  const title = titles[event] || "PostLift Update";
  const color = colors[event] || "#c87533";
  
  const subject = `${icon} ${title} — ${name}`;
  const html = baseTemplate(`
    <h1 style="color:${color}">${icon} ${title}</h1>
    <div class="stat">
      <div>
        <div style="font-size:16px;font-weight:800;color:#e8ecf4">${name}</div>
        <div class="stat-lbl">${email}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:700;color:${color};text-transform:capitalize">${plan} plan</div>
        <div class="stat-lbl">${new Date().toLocaleString("en-GB")}</div>
      </div>
    </div>
    ${event === "upgrade" ? `<p style="color:#22c55e;font-weight:700">💰 New recurring revenue added!</p>` : ""}
    <a href="${BASE_URL}/admin" class="btn" style="background:${color}">View Admin Dashboard →</a>
  `);
  return sendEmail(ADMIN_EMAIL, subject, html);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { action, name, email, stats } = body;

  // Verify internal secret
  const secret = req.headers["x-internal-secret"];
  if (secret !== process.env.INTERNAL_SECRET) return res.status(401).json({ error: "Unauthorised" });

  try {
    if (action === "welcome") { await sendWelcomeEmail(name, email); return res.status(200).json({ ok: true }); }
    if (action === "day3") { await sendDay3Email(name, email); return res.status(200).json({ ok: true }); }
    if (action === "day7") { await sendDay7Email(name, email); return res.status(200).json({ ok: true }); }
    if (action === "reengage") { await sendReEngagementEmail(name, email); return res.status(200).json({ ok: true }); }
    if (action === "weekly_stats") { await sendWeeklyStatsEmail(stats); return res.status(200).json({ ok: true }); }
    if (action === "admin_notify") { 
      const { event, plan } = body;
      await sendAdminNotification(event, name, email, plan); 
      return res.status(200).json({ ok: true }); 
    }
    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
