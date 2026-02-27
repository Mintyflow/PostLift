import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  // Handle subscription events
  if (event.type === "customer.subscription.deleted") {
    // Subscription cancelled - we log it (actual downgrade happens client-side on next login)
    const subscription = event.data.object;
    console.log("Subscription cancelled:", subscription.id, "Customer:", subscription.customer);
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    console.log("Subscription updated:", subscription.id, "Status:", subscription.status);
  }

  return res.status(200).json({ received: true });
}
