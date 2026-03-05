import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "postlift2025";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { action, password } = body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    if (action === "get_stats") {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, name, email, plan, posts_used, created_at")
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ error: error.message });

      const total = users.length;
      const free = users.filter(u => (u.plan || "free") === "free").length;
      const pro = users.filter(u => u.plan === "pro").length;
      const team = users.filter(u => u.plan === "team").length;

      // New signups this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newThisWeek = users.filter(u => new Date(u.created_at) >= weekAgo).length;

      const totalPosts = users.reduce((sum, u) => sum + (u.posts_used || 0), 0);

      return res.status(200).json({
        stats: { total, free, pro, team, newThisWeek, totalPosts, mrrGBP: (pro * 15) + (team * 39), mrrUSD: (pro * 19) + (team * 49) },
        users
      });
    }

    if (action === "update_plan") {
      const { userId, plan } = body;
      if (!["free", "pro", "team"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      const { error } = await supabase.from("users").update({ plan }).eq("id", userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    if (action === "delete_user") {
      const { userId } = body;
      await supabase.from("saved_posts").delete().eq("user_id", userId);
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
