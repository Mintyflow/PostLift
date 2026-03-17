// api/billing-portal.js
// Creates a Stripe Customer Portal session so users can manage their subscription,
// change payment method, download invoices, and cancel.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, email } = req.body || {};
  if (!userId && !email) return res.status(400).json({ error: "userId or email required" });

  const origin = req.headers.origin || "https://www.trypostlift.com";

  try {
    // Get user's stripe_customer_id from Supabase
    const query = supabase.from("users").select("stripe_customer_id, email");
    const { data: users } = userId
      ? await query.eq("id", userId).limit(1)
      : await query.eq("email", email).limit(1);

    const user = users?.[0];
    let customerId = user?.stripe_customer_id;

    // If no customer ID on record, create one in Stripe
    if (!customerId && (email || user?.email)) {
      const customer = await stripe.customers.create({ email: email || user.email });
      customerId = customer.id;
      if (user) {
        await supabase.from("users").update({ stripe_customer_id: customerId })
          .eq(userId ? "id" : "email", userId || email);
      }
    }

    if (!customerId) {
      return res.status(404).json({ error: "No billing account found. Please upgrade to a paid plan first." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?billing=returned`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Billing portal error:", err.message);
    return res.status(500).json({ error: err.message || "Could not open billing portal." });
  }
}
