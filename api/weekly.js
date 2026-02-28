// Cron job - runs every Monday at 8am
// Set up in Vercel: Settings -> Cron Jobs -> /api/weekly -> 0 8 * * 1
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Only allow Vercel cron or manual trigger with secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    // Get all users
    const { data: users } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: posts } = await supabase
      .from("saved_posts")
      .select("id");

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const newThisWeek = users?.filter(u => new Date(u.created_at) > weekAgo).length || 0;
    const free = users?.filter(u => u.plan === "free").length || 0;
    const pro = users?.filter(u => u.plan === "pro").length || 0;
    const team = users?.filter(u => u.plan === "team").length || 0;
    const mrrGBP = (pro * 15) + (team * 39);
    const mrrUSD = (pro * 19) + (team * 49);

    // Top 5 most active users
    const topUsers = [...(users || [])]
      .sort((a, b) => (b.posts_used || 0) - (a.posts_used || 0))
      .slice(0, 5)
      .filter(u => u.posts_used > 0);

    // Simple trend detection
    let trends = null;
    if (newThisWeek > 5) trends = `Strong growth week — ${newThisWeek} new signups. Consider posting about PostLift on LinkedIn to capitalise on momentum.`;
    else if (pro > free * 0.2) trends = `Conversion rate looking healthy — over 20% of users are on paid plans.`;
    else if (free > 0 && pro === 0) trends = `All users are on free tier. Consider a targeted upgrade email campaign.`;

    // Send weekly stats email
    const baseUrl = `https://trypostlift.com`;
    await fetch(`${baseUrl}/api/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
      body: JSON.stringify({
        action: "weekly_stats",
        stats: { total: users?.length || 0, newThisWeek, free, pro, team, mrrGBP, mrrUSD, topUsers, trends, totalPosts: posts?.length || 0 }
      })
    });

    // Send day 3 emails to users who signed up 3 days ago
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const day3Users = users?.filter(u => {
      const d = new Date(u.created_at);
      return d > new Date(threeDaysAgo - 12 * 60 * 60 * 1000) && d < new Date(threeDaysAgo + 12 * 60 * 60 * 1000);
    }) || [];

    for (const u of day3Users) {
      await fetch(`${baseUrl}/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "day3", name: u.name, email: u.email })
      });
    }

    // Send day 7 emails
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const day7Users = users?.filter(u => {
      const d = new Date(u.created_at);
      return d > new Date(sevenDaysAgo - 12 * 60 * 60 * 1000) && d < new Date(sevenDaysAgo + 12 * 60 * 60 * 1000) && u.plan === "free";
    }) || [];

    for (const u of day7Users) {
      await fetch(`${baseUrl}/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "day7", name: u.name, email: u.email })
      });
    }

    // Re-engagement emails for users inactive 14+ days
    const reEngageUsers = users?.filter(u => {
      const d = new Date(u.created_at);
      return d < twoWeeksAgo && (u.posts_used || 0) === 0 && u.plan === "free";
    }) || [];

    for (const u of reEngageUsers.slice(0, 50)) { // max 50 at a time
      await fetch(`${baseUrl}/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "reengage", name: u.name, email: u.email })
      });
    }

    return res.status(200).json({
      ok: true,
      sent: { weekly_stats: 1, day3: day3Users.length, day7: day7Users.length, reengage: Math.min(reEngageUsers.length, 50) }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
