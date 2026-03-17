// api/webhook.js
// Stripe webhook — the ONLY trusted source of truth for plan changes.
// Closes the security hole where anyone could visit /?upgrade=success&plan=pro
//
// Required env vars in Vercel:
//   STRIPE_SECRET_KEY        — Stripe dashboard > Developers > API keys
//   STRIPE_WEBHOOK_SECRET    — Stripe dashboard > Developers > Webhooks (whsec_...)
//   SUPABASE_URL             — Supabase project settings
//   SUPABASE_SERVICE_KEY     — Supabase project settings > API > service_role key

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Price ID to plan name — every Stripe price that grants access
const PRICE_TO_PLAN = {
  price_1T5QI6GslGhNptx5AF2rly1h: "pro",   // Pro GBP monthly £15
  price_1T5QKeGslGhNptx5MsfD1n8c: "pro",   // Pro USD monthly $19
  price_1TBaMIGslGhNptx5lhTxbYw2: "pro",   // Pro GBP annual £144
  price_1TBaMNGslGhNptx54zUFD2D1: "pro",   // Pro USD annual $182
  price_1T5QL0GslGhNptx54vizomoV: "team",  // Team GBP monthly £39
  price_1T5QLTGslGhNptx50dUHj2zA: "team",  // Team USD monthly $49
  price_1TBaMTGslGhNptx5qbcneKQz: "team",  // Team GBP annual £374
  price_1TBaMYGslGhNptx5ujF55kPZ: "team",  // Team USD annual $470
};

// Stripe requires the raw request body for signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end",  () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function findUser(customerId, email) {
  const query = supabase.from("users").select("id");
  if (customerId && email) {
    const { data } = await query.or(`stripe_customer_id.eq.${customerId},email.eq.${email}`).limit(1);
    return data?.[0] || null;
  }
  if (customerId) {
    const { data } = await query.eq("stripe_customer_id", customerId).limit(1);
    return data?.[0] || null;
  }
  if (email) {
    const { data } = await query.eq("email", email).limit(1);
    return data?.[0] || null;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook sig error:", err.message);
    return res.status(400).send("Webhook Error: " + err.message);
  }

  try {
    switch (event.type) {

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = PRICE_TO_PLAN[priceId];
        if (!plan) break;
        const user = await findUser(sub.customer, null);
        if (user) {
          await supabase.from("users").update({
            plan,
            stripe_customer_id: sub.customer,
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            plan_updated_at: new Date().toISOString(),
          }).eq("id", user.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const user = await findUser(sub.customer, null);
        if (user) {
          await supabase.from("users").update({
            plan: "free",
            stripe_subscription_id: null,
            subscription_status: "cancelled",
            plan_updated_at: new Date().toISOString(),
          }).eq("id", user.id);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;

        if (session.mode === "subscription") {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          const priceId = sub.items?.data?.[0]?.price?.id;
          const plan = PRICE_TO_PLAN[priceId];
          if (!plan) break;
          const user = await findUser(session.customer, email);
          if (user) {
            await supabase.from("users").update({
              plan,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              subscription_status: sub.status,
              plan_updated_at: new Date().toISOString(),
            }).eq("id", user.id);
          }
        }

        if (session.mode === "payment" && session.metadata?.addon_id && email) {
          await supabase.from("addon_purchases").upsert({
            email,
            stripe_customer_id: session.customer,
            addon_id: session.metadata.addon_id,
            session_id: session.id,
            purchased_at: new Date().toISOString(),
          }, { onConflict: "email,addon_id" });
        }
        break;
      }

      case "invoice.payment_failed": {
        const user = await findUser(event.data.object.customer, null);
        if (user) {
          await supabase.from("users").update({ subscription_status: "past_due" }).eq("id", user.id);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err.message);
  }

  res.status(200).json({ received: true });
}
