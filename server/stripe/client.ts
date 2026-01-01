import Stripe from "stripe";
import { ENV } from "../_core/env";

if (!ENV.stripeSecretKey) {
  console.warn("[Stripe] STRIPE_SECRET_KEY not configured");
}

export const stripe = new Stripe(ENV.stripeSecretKey || "sk_test_placeholder", {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});
