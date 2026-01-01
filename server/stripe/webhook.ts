import { Request, Response } from "express";
import { stripe } from "./client";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getPlanKeyByPriceId } from "./products";

/**
 * Stripe webhook handler
 * Handles all Stripe events and updates database accordingly
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing stripe-signature header");
  }

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      ENV.stripeWebhookSecret || ""
    );
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutCompleted(session: any) {
  console.log("[Stripe] Checkout completed:", session.id);

  const db = await getDb();
  if (!db) return;

  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) {
    console.error("[Stripe] No user ID in checkout session");
    return;
  }

  // Update user with Stripe customer ID
  await db
    .update(users)
    .set({
      stripeCustomerId: session.customer,
    })
    .where(eq(users.id, parseInt(userId)));

  console.log(`[Stripe] Updated user ${userId} with customer ID ${session.customer}`);
}

/**
 * Handle subscription creation or update
 */
async function handleSubscriptionUpdate(subscription: any) {
  console.log("[Stripe] Subscription updated:", subscription.id);

  const db = await getDb();
  if (!db) return;

  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price?.id;
  const planKey = getPlanKeyByPriceId(priceId);

  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, subscription.customer))
    .limit(1);

  if (!user) {
    console.error("[Stripe] User not found for customer:", subscription.customer);
    return;
  }

  // Update user subscription
  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPlan: planKey,
    })
    .where(eq(users.id, user.id));

  console.log(`[Stripe] Updated user ${user.id} subscription to ${planKey} (${subscription.status})`);
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: any) {
  console.log("[Stripe] Subscription deleted:", subscription.id);

  const db = await getDb();
  if (!db) return;

  // Find user by subscription ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (!user) {
    console.error("[Stripe] User not found for subscription:", subscription.id);
    return;
  }

  // Update user subscription status
  await db
    .update(users)
    .set({
      subscriptionStatus: "canceled",
    })
    .where(eq(users.id, user.id));

  console.log(`[Stripe] Canceled subscription for user ${user.id}`);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: any) {
  console.log("[Stripe] Invoice paid:", invoice.id);
  // Additional logic if needed (e.g., send receipt email)
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: any) {
  console.log("[Stripe] Invoice payment failed:", invoice.id);
  
  const db = await getDb();
  if (!db) return;

  // Find user and update status to past_due
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, invoice.customer))
    .limit(1);

  if (user) {
    await db
      .update(users)
      .set({
        subscriptionStatus: "past_due",
      })
      .where(eq(users.id, user.id));

    console.log(`[Stripe] Updated user ${user.id} status to past_due`);
  }
}
