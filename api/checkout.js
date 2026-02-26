import Stripe from "stripe";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { plan, currency, email } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Pick the right price ID based on plan + currency
    const priceMap = {
      pro_GBP: process.env.STRIPE_PRICE_PRO_GBP,
      pro_USD: process.env.STRIPE_PRICE_PRO_USD,
      team_GBP: process.env.STRIPE_PRICE_TEAM_GBP,
      team_USD: process.env.STRIPE_PRICE_TEAM_USD,
    };

    const priceId = priceMap[`${plan}_${currency}`];
    if (!priceId) return res.status(400).json({ error: "Invalid plan or currency" });

    const origin = req.headers.origin || "https://trypostlift.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${origin}/?upgrade=success&plan=${plan}`,
      cancel_url: `${origin}/?upgrade=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
