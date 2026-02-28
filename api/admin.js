import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "postlift-admin-2026";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { action, password, userId, plan } = body;

  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorised" });

  try {
    if (action === "get_stats") {
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: posts } = await supabase
        .from("saved_posts")
        .select("id");

      const total = users?.length || 0;
      const free = users?.filter(u => u.plan === "free").length || 0;
      const pro = users?.filter(u => u.plan === "pro").length || 0;
      const team = users?.filter(u => u.plan === "team").length || 0;
      const totalPosts = posts?.length || 0;
      const mrrGBP = (pro * 15) + (team * 39);
      const mrrUSD = (pro * 19) + (team * 49);

      return res.status(200).json({
        users,
        stats: { total, free, pro, team, totalPosts, mrrGBP, mrrUSD }
      });
    }

    if (action === "update_plan") {
      await supabase.from("users").update({ plan }).eq("id", userId);
      return res.status(200).json({ success: true });
    }

    if (action === "delete_user") {
      await supabase.from("users").delete().eq("id", userId);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
