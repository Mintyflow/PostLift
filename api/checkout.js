// api/checkout.js
// Handles Pro + Team subscription checkout (monthly AND annual)

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Verified price IDs — cross-checked against Stripe live account
const PRICES = {
  pro: {
    gbp: {
      monthly: "price_1T5QI6GslGhNptx5AF2rly1h",  // £15/mo
      annual:  "price_1TBaK9GslGhNptx5fIBVuTdo",  // £144/yr (= £12/mo)
    },
    usd: {
      monthly: "price_1T5QKeGslGhNptx5MsfD1n8c",  // $19/mo
      annual:  "price_1TBaKEGslGhNptx5XmZncqzl",  // $180/yr (= $15/mo)
    },
  },
  team: {
    gbp: {
      monthly: "price_1T5QL0GslGhNptx54vizomoV",  // £39/mo
      annual:  "price_1TBaKJGslGhNptx5F69RvJ1e",  // £384/yr (= £32/mo)
    },
    usd: {
      monthly: "price_1T5QLTGslGhNptx50dUHj2zA",  // $49/mo
      annual:  "price_1TBaKNGslGhNptx5ZHb9Zw13",  // $468/yr (= $39/mo)
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { plan, currency, email, annual = false } = req.body || {};

  if (!plan || !currency) return res.status(400).json({ error: "plan and currency are required" });

  const cur = currency.toLowerCase();
  const billing = annual ? "annual" : "monthly";
  const priceId = PRICES[plan]?.[cur]?.[billing];

  if (!priceId) return res.status(400).json({ error: `No price found for ${plan}/${cur}/${billing}` });

  const origin = req.headers.origin || "https://www.trypostlift.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // SECURE: plan confirmed server-side via webhook — not URL params
      success_url: `${origin}/?upgrade=pending&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/?upgrade=cancelled`,
      customer_email: email || undefined,
      metadata: { plan, source: "postlift_subscription" },
      subscription_data: { metadata: { plan, source: "postlift_subscription" } },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return res.status(500).json({ error: err.message || "Stripe error. Please try again." });
  }
}
