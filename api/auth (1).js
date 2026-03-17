import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Simple password hashing (use bcrypt in production ideally)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "pl_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { action, email, password, name } = body;

  try {
    if (action === "register") {
      // Check if user exists
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (existing) return res.status(400).json({ error: "An account with this email already exists." });

      const password_hash = await hashPassword(password);
      const monthKey = new Date().toISOString().slice(0, 7);

      const { data: user, error } = await supabase
        .from("users")
        .insert({ email: email.toLowerCase(), name, password_hash, plan: "free", posts_used: 0, posts_month: monthKey })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      // Send welcome email + admin notification (fire and forget)
      const baseUrl = "https://trypostlift.com";
      fetch(`${baseUrl}/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "welcome", name: user.name, email: user.email })
      }).catch(() => {});
      fetch(`${baseUrl}/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "admin_notify", event: "signup", name: user.name, email: user.email, plan: "free" })
      }).catch(() => {});

      return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan, posts_used: user.posts_used, posts_month: user.posts_month } });
    }

    if (action === "login") {
      const password_hash = await hashPassword(password);

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("password_hash", password_hash)
        .single();

      if (error || !user) return res.status(401).json({ error: "Incorrect email or password." });

      // Reset monthly counter if new month
      const monthKey = new Date().toISOString().slice(0, 7);
      if (user.posts_month !== monthKey) {
        await supabase.from("users").update({ posts_used: 0, posts_month: monthKey }).eq("id", user.id);
        user.posts_used = 0;
        user.posts_month = monthKey;
      }

      return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan, posts_used: user.posts_used, posts_month: user.posts_month } });
    }

    if (action === "increment") {
      const { userId } = body;
      const { data: user } = await supabase.from("users").select("posts_used, posts_month").eq("id", userId).single();
      if (!user) return res.status(404).json({ error: "User not found" });

      const monthKey = new Date().toISOString().slice(0, 7);
      const newCount = user.posts_month === monthKey ? user.posts_used + 1 : 1;

      await supabase.from("users").update({ posts_used: newCount, posts_month: monthKey }).eq("id", userId);
      return res.status(200).json({ posts_used: newCount });
    }

    if (action === "upgrade") {
      const { userId, plan } = body;
      await supabase.from("users").update({ plan }).eq("id", userId);
      return res.status(200).json({ success: true });
    }

    // ── Called by Stripe webhook after successful payment ──────────────────
    if (action === "upgrade_by_email") {
      const { email: upgradeEmail, plan, stripeCustomerId } = body;
      if (!upgradeEmail || !plan) return res.status(400).json({ error: "email and plan required" });

      const normalEmail = upgradeEmail.toLowerCase();
      const updateData = { plan };
      if (stripeCustomerId) updateData.stripe_customer_id = stripeCustomerId;

      const { data: user, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("email", normalEmail)
        .select()
        .single();

      if (error || !user) {
        // User may not exist yet (paid before creating account) — create them
        const monthKey = new Date().toISOString().slice(0, 7);
        const { data: newUser, error: insertErr } = await supabase
          .from("users")
          .insert({ email: normalEmail, name: normalEmail.split("@")[0], plan, posts_used: 0, posts_month: monthKey, stripe_customer_id: stripeCustomerId || null })
          .select()
          .single();
        if (insertErr) return res.status(500).json({ error: insertErr.message });

        // Send upgrade notification email
        fetch("https://trypostlift.com/api/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
          body: JSON.stringify({ action: "admin_notify", event: "upgrade", email: normalEmail, plan })
        }).catch(() => {});

        return res.status(200).json({ success: true, user: newUser });
      }

      // Send upgrade notification email
      fetch("https://trypostlift.com/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "admin_notify", event: "upgrade", email: normalEmail, plan })
      }).catch(() => {});

      return res.status(200).json({ success: true, user });
    }

    // ── Called by Stripe webhook when subscription is cancelled ───────────
    if (action === "downgrade_by_email") {
      const { email: downgradeEmail, stripeCustomerId } = body;
      if (!downgradeEmail) return res.status(400).json({ error: "email required" });

      const normalEmail = downgradeEmail.toLowerCase();
      await supabase.from("users").update({ plan: "free" }).eq("email", normalEmail);

      // Send cancellation notification email
      fetch("https://trypostlift.com/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "admin_notify", event: "cancellation", email: normalEmail })
      }).catch(() => {});

      return res.status(200).json({ success: true });
    }

    if (action === "save_post") {
      const { userId, style, content, topic } = body;
      const { data, error } = await supabase.from("saved_posts").insert({ user_id: userId, style, content, topic }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ post: data });
    }

    if (action === "get_posts") {
      const { userId } = body;
      const { data, error } = await supabase.from("saved_posts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ posts: data });
    }

    if (action === "delete_post") {
      const { postId } = body;
      await supabase.from("saved_posts").delete().eq("id", postId);
      return res.status(200).json({ success: true });
    }

    if (action === "sync_profile") {
      const { authId, email: syncEmail, name: syncName } = body;
      const normalEmail = syncEmail.toLowerCase();

      // Check if profile already exists by email
      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("email", normalEmail)
        .single();

      if (existing) {
        // Reset monthly counter if new month
        const monthKey = new Date().toISOString().slice(0, 7);
        if (existing.posts_month !== monthKey) {
          await supabase.from("users").update({ posts_used: 0, posts_month: monthKey }).eq("id", existing.id);
          existing.posts_used = 0;
          existing.posts_month = monthKey;
        }
        return res.status(200).json({ user: { id: existing.id, email: existing.email, name: existing.name, plan: existing.plan, posts_used: existing.posts_used, posts_month: existing.posts_month } });
      }

      // Create new profile
      const monthKey = new Date().toISOString().slice(0, 7);
      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert({ email: normalEmail, name: syncName || normalEmail.split("@")[0], plan: "free", posts_used: 0, posts_month: monthKey })
        .select()
        .single();

      if (insertErr) return res.status(500).json({ error: insertErr.message });

      // Send welcome email + admin notification (fire and forget)
      const baseUrl = "https://trypostlift.com";
      fetch(`${baseUrl}/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "welcome", name: newUser.name, email: newUser.email })
      }).catch(() => {});
      fetch(`${baseUrl}/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "pl-internal-2026" },
        body: JSON.stringify({ action: "admin_notify", event: "signup", name: newUser.name, email: newUser.email, plan: "free" })
      }).catch(() => {});

      return res.status(200).json({ user: { id: newUser.id, email: newUser.email, name: newUser.name, plan: newUser.plan, posts_used: newUser.posts_used, posts_month: newUser.posts_month } });
    }

    if (action === "forgot_password") {
      const { data: user } = await supabase.from("users").select("id").eq("email", email.toLowerCase()).single();
      if (!user) return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
      // For now just return success - email system needed for real reset
      return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
