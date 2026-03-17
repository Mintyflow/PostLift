// api/checkout-addon.js
// Vercel serverless function — one-time bolt-on purchases via Stripe Checkout
// Called by AddonModal when a free user wants to buy a single tool directly

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ── Price ID map ─────────────────────────────────────────────────────────────
// Each addon has a GBP and USD one-time price created in Stripe
const PRICE_IDS = {
  hooks:     { gbp: "price_1TBa0mGslGhNptx5HhHHCZ1o", usd: "price_1TBa1vGslGhNptx5PWvXpg4d" },
  profile:   { gbp: "price_1TBa23GslGhNptx5vVIswMyT", usd: "price_1TBa27GslGhNptx5B3krHtCX" },
  outreach:  { gbp: "price_1TBa2GGslGhNptx53wx8GthP", usd: "price_1TBa2MGslGhNptx5Mbo2aJ5R" },
  pillars:   { gbp: "price_1TBa2WGslGhNptx5hk00UMUI", usd: "price_1TBa2aGslGhNptx51JGMc0Lr" },
  about:     { gbp: "price_1TBa2iGslGhNptx5bpXkLgpg", usd: "price_1TBa2mGslGhNptx5uCl0oAVY" },
  repurpose: { gbp: "price_1TBa2wGslGhNptx5MhNwXN6r", usd: "price_1TBa31GslGhNptx5aleuOBo6" },
  comment:   { gbp: "price_1TBa39GslGhNptx5huWoIcpy", usd: "price_1TBa3DGslGhNptx5xejUfOYK" },
  credits:   { gbp: "price_1TBa40GslGhNptx5zPJO6jQ1", usd: "price_1TBa42GslGhNptx5PRRyvWvJ" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { addonId, currency, email } = req.body || {};

  if (!addonId || !currency) {
    return res.status(400).json({ error: "addonId and currency are required" });
  }

  const cur = currency.toLowerCase();
  const prices = PRICE_IDS[addonId];

  if (!prices) {
    return res.status(400).json({ error: "Unknown add-on: " + addonId });
  }

  const priceId = cur === "gbp" ? prices.gbp : prices.usd;
  if (!priceId) {
    return res.status(400).json({ error: "No price found for " + addonId + " in " + cur });
  }

  const origin = req.headers.origin || "https://www.trypostlift.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      // On success, redirect back with addon ID in URL so the app can unlock it client-side
      success_url: `${origin}/?addon_success=${addonId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/?addon_cancel=${addonId}`,
      customer_email: email || undefined,
      metadata: {
        addon_id: addonId,
        source:   "postlift_addon",
      },
      payment_intent_data: {
        metadata: {
          addon_id: addonId,
          source:   "postlift_addon",
        },
      },
      // Allow promo codes
      allow_promotion_codes: true,
      // Collect billing address (required for UK VAT compliance)
      billing_address_collection: "auto",
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout-addon error:", err.message);
    return res.status(500).json({ error: err.message || "Stripe error. Please try again." });
  }
}
